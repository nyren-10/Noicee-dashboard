from PIL import Image, ImageDraw
import os

# Ensure the public folder exists
os.makedirs('frontend/public', exist_ok=True)

# Generate both required sizes
for size in [192, 512]:
    # Create a dark background matching your app UI
    img = Image.new('RGB', (size, size), color='#111827')
    draw = ImageDraw.Draw(img)
    
    # Draw a neon blue futuristic square inside it
    margin = size // 5
    thickness = size // 15
    draw.rectangle([margin, margin, size-margin, size-margin], outline='#3B82F6', width=thickness)
    
    # Save directly to your Vite public folder
    filename = f'frontend/public/pwa-{size}x{size}.png'
    img.save(filename)
    print(f"Boom. {filename} created successfully.")