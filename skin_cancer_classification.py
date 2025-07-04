import sys
from model_inference import SkinCancerModel

def main(image_path):
    model = SkinCancerModel()
    result = model.predict(image_path)
    if 'error' in result:
        print(f"Error: {result['error']}")
    else:
        print("Skin Cancer Classification Result:")
        print(f"Disease Type: {result['disease_name']}")
        print(f"Confidence: {result['confidence']:.2f}%")
        print(f"Risk Level: {result['risk_level']}")
        print(f"Description: {result['description']}")
        print(f"Recommendation: {result['recommendation']}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python skin_cancer_classification.py <image_path>")
        sys.exit(1)
    image_path = sys.argv[1]
    main(image_path)
