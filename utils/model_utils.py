import torch
import torch.nn as nn
import torchvision.models as models
import timm
import numpy as np
from PIL import Image
import torchvision.transforms as transforms
from pytorch_grad_cam import EigenCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
import joblib

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ====================== CBAM ======================
class CBAM(nn.Module):
    def __init__(self, channels, reduction=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc1 = nn.Conv2d(channels, channels // reduction, 1, bias=False)
        self.relu = nn.ReLU(inplace=True)
        self.fc2 = nn.Conv2d(channels // reduction, channels, 1, bias=False)
        self.conv = nn.Conv2d(2, 1, kernel_size=7, padding=3, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = self.fc2(self.relu(self.fc1(self.avg_pool(x))))
        max_out = self.fc2(self.relu(self.fc1(self.max_pool(x))))
        channel_att = self.sigmoid(avg_out + max_out)
        x = x * channel_att

        avg_spatial = torch.mean(x, dim=1, keepdim=True)
        max_spatial, _ = torch.max(x, dim=1, keepdim=True)
        spatial = torch.cat([avg_spatial, max_spatial], dim=1)
        spatial_att = self.sigmoid(self.conv(spatial))
        x = x * spatial_att
        return x


# ====================== MODELS ======================
class ResNet50_CBAM(nn.Module):
    def __init__(self, num_classes=8):
        super().__init__()
        self.base = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
        self.cbam1 = CBAM(256)
        self.cbam2 = CBAM(512)
        self.cbam3 = CBAM(1024)
        self.cbam4 = CBAM(2048)
        self.base.fc = nn.Linear(self.base.fc.in_features, num_classes)

    def forward(self, x):
        x = self.base.conv1(x)
        x = self.base.bn1(x)
        x = self.base.relu(x)
        x = self.base.maxpool(x)
        x = self.base.layer1(x); x = self.cbam1(x)
        x = self.base.layer2(x); x = self.cbam2(x)
        x = self.base.layer3(x); x = self.cbam3(x)
        x = self.base.layer4(x); x = self.cbam4(x)
        x = self.base.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.base.fc(x)
        return x


class EfficientNet_CBAM(nn.Module):
    def __init__(self, num_classes=8):
        super().__init__()
        self.base = timm.create_model('efficientnet_b0', pretrained=True, num_classes=0)
        self.cbam1 = CBAM(40)
        self.cbam2 = CBAM(112)
        self.cbam3 = CBAM(1280)
        self.classifier = nn.Linear(1280, num_classes)

    def forward(self, x):
        features = self.base.forward_features(x)
        features = self.cbam3(features)
        x = self.base.global_pool(features)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


class ResNet50_CBAM_FeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = ResNet50_CBAM()
        self.model.load_state_dict(torch.load('models/best_resnet_with_cbam.pth', 
                                            map_location=device, weights_only=True))
        self.model.eval().to(device)
        self.feature_extractor = nn.Sequential(*list(self.model.base.children())[:-1])

    def forward(self, x):
        with torch.no_grad():
            feats = self.feature_extractor(x)
            return torch.flatten(feats, 1)


class EfficientNet_CBAM_FeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        self.model = EfficientNet_CBAM()
        self.model.load_state_dict(torch.load('models/best_efficientnet_with_cbam.pth', 
                                            map_location=device, weights_only=True))
        self.model.eval().to(device)

    def forward(self, x):
        with torch.no_grad():
            feats = self.model.base.forward_features(x)
            feats = self.model.cbam3(feats)
            feats = self.model.base.global_pool(feats)
            return torch.flatten(feats, 1)


# ====================== PREDICTION FUNCTION ======================
transform = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor()])

_resnet_ext = None
_effnet_ext = None
_xgb_model = None

def load_ml_models():
    global _resnet_ext, _effnet_ext, _xgb_model
    if _resnet_ext is None:
        _resnet_ext = ResNet50_CBAM_FeatureExtractor()
        _effnet_ext = EfficientNet_CBAM_FeatureExtractor()
        _xgb_model = joblib.load('models/xgboost_fused_model.sav')
    return _resnet_ext, _effnet_ext, _xgb_model

def predict_and_explain(image_pil, age=None, gender=None):
    img_tensor = transform(image_pil).unsqueeze(0).to(device)

    # Load models
    resnet_ext, effnet_ext, xgb_model = load_ml_models()

    # Feature fusion
    res_feat = resnet_ext(img_tensor)
    eff_feat = effnet_ext(img_tensor)
    fused = torch.cat([res_feat, eff_feat], dim=1)

    if age is None or gender is None:
        age, gender = 60, 1

    patient_info = torch.tensor([[float(age), float(gender)]], dtype=torch.float32, device=device)
    final_features = torch.cat([fused, patient_info], dim=1).cpu().numpy()

    # XGBoost prediction
    probas = np.array([est.predict_proba(final_features)[:, 1] for est in xgb_model.estimators_]).T[0]

    disease_names = ['Normal (N)', 'DR (D)', 'Glaucoma (G)', 'Cataract (C)',
                     'AMD (A)', 'Hypertension (H)', 'Myopia (M)', 'Other (O)']

    # EigenCAM
    target_layers = [resnet_ext.model.base.layer4[-1]]
    cam = EigenCAM(model=resnet_ext.model.base, target_layers=target_layers)
    grayscale_cam = cam(input_tensor=img_tensor, targets=[ClassifierOutputTarget(int(np.argmax(probas)))])[0]

    rgb_img = np.array(image_pil.resize((224, 224))) / 255.0
    visualization = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)

    return probas, disease_names, visualization