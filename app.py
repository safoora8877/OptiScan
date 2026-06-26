import os
import streamlit as st
from PIL import Image
import numpy as np
from datetime import datetime
from utils.model_utils import predict_and_explain
from utils.rag_utils import get_rag_response

if "GROQ_API_KEY" in st.secrets:
    os.environ["GROQ_API_KEY"] = st.secrets["GROQ_API_KEY"]

st.set_page_config(
    page_title="optiScan - AI Eye Disease Detection",
    page_icon="👁️",
    layout="wide"
)

# Custom CSS
st.markdown("""
<style>
    .main {background-color: #f8fafc;}
    h1 {color: #1e40af;}
    .stButton>button {height: 3rem; font-size: 18px;}
</style>
""", unsafe_allow_html=True)

# ====================== LANDING PAGE ======================
if 'page' not in st.session_state:
    st.session_state.page = "landing"

if st.session_state.page == "landing":
    st.title("👁️ optiScan")
    st.subheader("Intelligent Retinal Disease Detection & Eye Health Assistant")

    col1, col2 = st.columns([1, 1])
    with col1:
        st.image("https://source.unsplash.com/random/800x600/?eye,vision", use_column_width=True)
    
    with col2:
        st.markdown("""
        ### Detect Eye Diseases Early
        
        Powered by advanced AI ensemble (ResNet50 + EfficientNet + XGBoost)
        
        **Capabilities:**
        - 8 Major Retinal Diseases Detection
        - Eigen-CAM Visualization
        - Medical Chat Assistant (Powered by Groq + RAG)
        """)
        
        if st.button("🚀 Start Using optiScan", type="primary", use_container_width=True):
            st.session_state.page = "main"
            st.rerun()

# ====================== MAIN APPLICATION ======================
else:
    st.title("👁️ optiScan - Retina Disease Detection")

    tab1, tab2 = st.tabs(["🖼️ Disease Detection", "💬 Eye Health Assistant"])

    # ====================== TAB 1: DISEASE DETECTION ======================
    with tab1:
        with st.expander("📋 Patient Information", expanded=True):
            col1, col2 = st.columns(2)
            with col1:
                patient_name = st.text_input("Patient Name (Optional)")
                age = st.number_input("Age", 1, 120, 60)
            with col2:
                gender = st.radio("Gender", ["Male", "Female"], horizontal=True)

        st.markdown("### Upload Fundus Image")
        uploaded_file = st.file_uploader("Drag & drop or browse fundus image", 
                                       type=["jpg", "jpeg", "png"])

        if uploaded_file:
            image = Image.open(uploaded_file).convert("RGB")
            st.image(image, caption="Uploaded Image", use_column_width=True)

            if st.button("🔍 Analyze Image", type="primary"):
                with st.spinner("Running AI Analysis..."):
                    gender_val = 1 if gender == "Male" else 0
                    probas, disease_names, viz = predict_and_explain(image, age, gender_val)

                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.image(image, caption="Original Fundus")
                    with col_b:
                        st.image(viz, caption="Eigen-CAM Highlighted Areas")

                    st.subheader("AI Prediction Results")
                    for i, name in enumerate(disease_names):
                        prob = probas[i] * 100
                        emoji = "🟢" if prob > 70 else "🟡" if prob > 40 else "🔴"
                        st.write(f"{emoji} **{name}**: {prob:.1f}%")

                    # Download Report
                    report = f"optiScan Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
                    report += f"Patient: {patient_name or 'N/A'} | Age: {age} | Gender: {gender}\n\n"
                    for i, name in enumerate(disease_names):
                        report += f"{name}: {probas[i]*100:.1f}%\n"

                    st.download_button("📥 Download Report", report, 
                                     f"optiscan_report_{datetime.now().strftime('%Y%m%d')}.txt")

    # ====================== TAB 2: RAG CHATBOT ======================
    with tab2:
        st.subheader("💬 Eye Health Assistant (Powered by Groq + RAG)")

        st.info("Ask questions as a **patient** or **doctor**. The assistant will ask for more details if needed.")

        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []

        for message in st.session_state.chat_history:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        if prompt := st.chat_input("Ask anything about eye diseases, symptoms, treatment, or prevention..."):
            st.session_state.chat_history.append({"role": "user", "content": prompt})
            with st.chat_message("user"):
                st.markdown(prompt)

            with st.chat_message("assistant"):
                with st.spinner("Thinking..."):
                    response, sources = get_rag_response(prompt)
                    st.markdown(response)
                    
                    # Optional: Show sources
                    with st.expander("View Sources"):
                        for i, doc in enumerate(sources[:3]):
                            st.caption(f"Source {i+1}: {doc.metadata.get('source', 'Unknown')}")

            st.session_state.chat_history.append({"role": "assistant", "content": response})