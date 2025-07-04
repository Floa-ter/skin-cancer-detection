"""
Skin Cancer Classification Model Training
Dataset: HAM10000 (can be downloaded from Kaggle)
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import tensorflow as tf # type: ignore
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout, Flatten, Conv2D, MaxPooling2D
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.callbacks import ModelCheckpoint, EarlyStopping
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix


# Set random seed for reproducibility
np.random.seed(42)
tf.random.set_seed(42)

# Dataset paths - update these paths based on your setup
DATASET_PATH = 'path_to_ham10000_images_folder'  # Replace with actual path
METADATA_PATH = 'path_to_ham10000_metadata.csv'  # Replace with actual path

def prepare_data():
    """Prepare data for training and validation"""
    # Read the metadata
    df = pd.read_csv(METADATA_PATH)
    
    # Map diagnosis labels to integers
    lesion_type_dict = {
        'nv': 0,      # Melanocytic nevi
        'mel': 1,     # Melanoma
        'bkl': 2,     # Benign keratosis-like lesions
        'bcc': 3,     # Basal cell carcinoma
        'akiec': 4,   # Actinic keratoses
        'vasc': 5,    # Vascular lesions
        'df': 6       # Dermatofibroma
    }
    
    # Add numeric labels
    df['label'] = df['dx'].map(lesion_type_dict)
    
    # Create train/validation/test splits
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
    train_df, val_df = train_test_split(train_df, test_size=0.2, random_state=42)
    
    # Map image IDs to file paths (update this based on your file structure)
    def get_image_path(image_id):
        return os.path.join(DATASET_PATH, f"{image_id}.jpg")
    
    train_df['path'] = train_df['image_id'].apply(get_image_path)
    val_df['path'] = val_df['image_id'].apply(get_image_path)
    test_df['path'] = test_df['image_id'].apply(get_image_path)
    
    return train_df, val_df, test_df, lesion_type_dict

def create_data_generators(train_df, val_df, test_df):
    """Create data generators for training, validation, and testing"""
    # Data augmentation for training set
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    # Only rescaling for validation and test sets
    val_datagen = ImageDataGenerator(rescale=1./255)
    test_datagen = ImageDataGenerator(rescale=1./255)
    
    # Parameters for data loading
    batch_size = 32
    img_size = (224, 224)
    
    # Create generators
    train_generator = train_datagen.flow_from_dataframe(
        dataframe=train_df,
        x_col='path',
        y_col='label',
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=True
    )
    
    val_generator = val_datagen.flow_from_dataframe(
        dataframe=val_df,
        x_col='path',
        y_col='label',
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    test_generator = test_datagen.flow_from_dataframe(
        dataframe=test_df,
        x_col='path',
        y_col='label',
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    return train_generator, val_generator, test_generator

def create_model(num_classes):
    """Create CNN model for skin cancer classification"""
    model = Sequential([
        # First convolutional block
        Conv2D(32, (3, 3), activation='relu', padding='same', input_shape=(224, 224, 3)),
        Conv2D(32, (3, 3), activation='relu', padding='same'),
        MaxPooling2D((2, 2)),
        Dropout(0.25),
        
        # Second convolutional block
        Conv2D(64, (3, 3), activation='relu', padding='same'),
        Conv2D(64, (3, 3), activation='relu', padding='same'),
        MaxPooling2D((2, 2)),
        Dropout(0.25),
        
        # Third convolutional block
        Conv2D(128, (3, 3), activation='relu', padding='same'),
        Conv2D(128, (3, 3), activation='relu', padding='same'),
        MaxPooling2D((2, 2)),
        Dropout(0.25),
        
        # Fully connected layers
        Flatten(),
        Dense(512, activation='relu'),
        Dropout(0.5),
        Dense(num_classes, activation='softmax')
    ])
    
    # Compile the model
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def train_model(model, train_generator, val_generator):
    """Train the model with early stopping and model checkpointing"""
    # Create callbacks
    checkpoint = ModelCheckpoint(
        'model/best_model.h5',
        monitor='val_accuracy',
        save_best_only=True,
        mode='max',
        verbose=1
    )
    
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True,
        verbose=1
    )
    
    # Train the model
    history = model.fit(
        train_generator,
        epochs=50,
        validation_data=val_generator,
        callbacks=[checkpoint, early_stopping]
    )
    
    return history, model

def evaluate_model(model, test_generator):
    """Evaluate the model on test data and plot results"""
    # Get the true labels
    y_true = test_generator.classes
    
    # Get predictions
    predictions = model.predict(test_generator)
    y_pred = np.argmax(predictions, axis=1)
    
    # Print classification report
    print(classification_report(y_true, y_pred))
    
    # Create confusion matrix
    cm = confusion_matrix(y_true, y_pred)
    
    # Plot confusion matrix
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    
    classes = list(test_generator.class_indices.keys())
    tick_marks = np.arange(len(classes))
    plt.xticks(tick_marks, classes, rotation=45)
    plt.yticks(tick_marks, classes)
    
    plt.tight_layout()
    plt.ylabel('True label')
    plt.xlabel('Predicted label')
    plt.savefig('model/confusion_matrix.png')
    
    return y_true, y_pred

def save_model(model):
    """Save the trained model and class mappings"""
    # Save the model
    model.save('model/trained_model.h5')
    
    # Save the class mappings
    with open('model/class_indices.txt', 'w') as f:
        for class_name, class_idx in train_generator.class_indices.items():
            f.write(f"{class_name}: {class_idx}\n")

if __name__ == "__main__":
    # Create model directory if it doesn't exist
    os.makedirs('model', exist_ok=True)
    
    # Prepare data
    train_df, val_df, test_df, lesion_type_dict = prepare_data()
    
    # Create data generators
    train_generator, val_generator, test_generator = create_data_generators(train_df, val_df, test_df)
    
    # Create and train model
    model = create_model(num_classes=len(lesion_type_dict))
    history, trained_model = train_model(model, train_generator, val_generator)
    
    # Evaluate model
    y_true, y_pred = evaluate_model(trained_model, test_generator)
    
    # Save the model
    save_model(trained_model)
    
    print("Model training and evaluation complete!")
