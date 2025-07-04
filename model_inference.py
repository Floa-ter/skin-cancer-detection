"""
Skin Cancer Classification Model Inference
"""

import os
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image

class SkinCancerModel:
    def __init__(self, model_path='model/trained_model.h5', class_indices_path='model/class_indices.txt'):
        """Initialize the model and class mappings"""
        # Load the trained model
        self.model = load_model(model_path)
        
        # Load class indices
        self.class_indices = {}
        self.load_class_indices(class_indices_path)

        
        # Reverse the class indices for prediction mapping
        self.idx_to_class = {v: k for k, v in self.class_indices.items()}
        
        # Disease descriptions for each class
        self.disease_info = {
            'nv': {
                'name': 'Melanocytic Nevus',
                'description': 'A common, usually benign mole. Regular monitoring is recommended.',
                'risk_level': 'Low',
                'recommendation': 'Annual skin check recommended.'
            },
            'mel': {
                'name': 'Melanoma',
                'description': 'A serious form of skin cancer. Immediate medical attention required.',
                'risk_level': 'High',
                'recommendation': 'Please consult a dermatologist immediately.'
            },
            'bkl': {
                'name': 'Benign Keratosis',
                'description': 'A non-cancerous growth that may include seborrheic keratoses and solar lentigo.',
                'risk_level': 'Low',
                'recommendation': 'Routine monitoring recommended.'
            },
            'bcc': {
                'name': 'Basal Cell Carcinoma',
                'description': 'The most common form of skin cancer. Rarely metastasizes but requires treatment.',
                'risk_level': 'Medium',
                'recommendation': 'Medical consultation required for treatment options.'
            },
            'akiec': {
                'name': 'Actinic Keratosis / Intraepithelial Carcinoma',
                'description': 'Pre-cancerous or early cancerous lesion with potential to progress to squamous cell carcinoma.',
                'risk_level': 'Medium',
                'recommendation': 'Medical consultation recommended within 1-2 weeks.'
            },
            'vasc': {
                'name': 'Vascular Lesion',
                'description': 'Benign vascular skin condition such as angiomas or pyogenic granulomas.',
                'risk_level': 'Low',
                'recommendation': 'Consult with dermatologist if changes occur.'
            },
            'df': {
                'name': 'Dermatofibroma',
                'description': 'A common benign skin nodule, often firm and slightly raised.',
                'risk_level': 'Very Low',
                'recommendation': 'No immediate action needed. Monitor for changes.'
            }
        }
    
    def load_class_indices(self, class_indices_path):
        """Load class indices from file"""
        try:
            with open(class_indices_path, 'r') as f:
                for line in f:
                    class_name, class_idx = line.strip().split(': ')
                    self.class_indices[class_name] = int(class_idx)
        except FileNotFoundError:
            # Default class indices if file not found
            self.class_indices = {
                'nv': 0,      # Melanocytic nevi
                'mel': 1,     # Melanoma
                'bkl': 2,     # Benign keratosis-like lesions
                'bcc': 3,     # Basal cell carcinoma
                'akiec': 4,   # Actinic keratoses
                'vasc': 5,    # Vascular lesions
                'df': 6       # Dermatofibroma
            }
    
    def preprocess_image(self, img_path):
        """Preprocess an image for model prediction"""
        img = Image.open(img_path)
        img = img.resize((224, 224))  # Resize to the input size of the model
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array = img_array / 255.0  # Normalize
        return img_array
    
    def predict(self, img_path):
        """Make a prediction for the image and return detailed information"""
        try:
            # Preprocess the image
            processed_img = self.preprocess_image(img_path)
            
            # Make prediction
            predictions = self.model.predict(processed_img)
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class_idx])
            
            # Get the class name
            class_name = self.idx_to_class[predicted_class_idx]
            
            # Get disease information
            disease_info = self.disease_info.get(class_name, {
                'name': 'Unknown',
                'description': 'No information available',
                'risk_level': 'Unknown',
                'recommendation': 'Please consult a medical professional'
            })
            
            # Create result dictionary
            result = {
                'class_name': class_name,
                'disease_name': disease_info['name'],
                'description': disease_info['description'],
                'confidence': confidence * 100,  # Convert to percentage
                'risk_level': disease_info['risk_level'],
                'recommendation': disease_info['recommendation']
            }
            
            return result
            
        except Exception as e:
            print(f"Error during prediction: {e}")
            return {
                'error': str(e),
                'class_name': 'error',
                'disease_name': 'Error',
                'description': 'Unable to process the image',
                'confidence': 0,
                'risk_level': 'Unknown',
                'recommendation': 'Please try again with a different image'
            }
