import os
import json
import psycopg2
from dotenv import load_dotenv

# Load your .env file
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def reset_and_seed_database():
    print("🔄 Connecting to Neon Database...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    try:
        print("🗑️ Wiping old bloated tables...")
        # Drop the table to clear out all 700+ messy rows and schema conflicts
        cursor.execute("DROP TABLE IF EXISTS products CASCADE;")
        
        print("🏗️ Rebuilding perfect schema...")
        # Create the exact schema the frontend expects
        cursor.execute("""
            CREATE TABLE products (
                id SERIAL PRIMARY KEY,
                product_id VARCHAR(50),
                seller_id VARCHAR(50),
                name VARCHAR(255),
                description TEXT,
                return_rate INTEGER,
                rating DECIMAL(3,1),
                raw_reviews JSONB,
                image_url VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        print("🌱 Seeding 25 pristine showcase products...")

        mock_reviews_pool = [
            ["Kapda patla hai, see-through lagta hai.", "Color wash ke baad fade ho gaya.", "Fitting theek hai par material cheap."],
            ["Size chart galat hai, chhota aaya.", "Fabric comfortable hai summer ke liye.", "Delivery late thi par product accha."],
            ["Battery jaldi drain hoti hai ANC on karke.", "Bluetooth connect nahi hota phone se.", "Sound quality average hai price ke hisaab se."],
            ["Bangle size mismatch, return karna padega.", "Design bahut sundar hai festive ke liye.", "Gold plating peel ho rahi hai 1 week mein."],
            ["Bedsheet color fast nahi hai.", "Cushion cover stitching loose hai.", "Jute rug smell bahut strong hai initially."],
        ]
        
        # 5 Premium Sellers x 5 Products = 25 perfect rows
        seed_data = [
            # SELLER 1: Puja's Hub Store
            ("COMP-BLUE-KURTA", "SELLER_PUJA_00", "Blue Embroidered Cotton Kurta", "Pure cotton daily wear kurta.", 35, 3.1, "/illustrations/shopping-sprint.png"),
            ("COMP-PINK-SAREE", "SELLER_PUJA_00", "Zari Work Pink Silk Saree", "Premium festive wear silk saree.", 26, 3.5, "/illustrations/content-woman.png"),
            ("COMP-YEL-DUPATTA", "SELLER_PUJA_00", "Chanderi Dupatta Yellow", "Lightweight chanderi dupatta.", 19, 3.8, "/illustrations/worker-catalog.png"),
            ("COMP-JAIPUR-ANAR", "SELLER_PUJA_00", "Jaipuri Print Anarkali", "Rayon anarkali suit set.", 12, 4.1, "/illustrations/shopping-woman.png"),
            ("COMP-CASUAL-TOP", "SELLER_PUJA_00", "Cotton Casual Block Print Top", "Summer friendly block print top.", 41, 2.9, "/illustrations/shopping-sprint.png"),

            # SELLER 2: Amit Apparel Hub
            ("AMIT-SLIM-SHIRT", "SELLER_AMIT_03", "Men Slim Fit Cotton Shirt", "Formal slim fit shirt.", 28, 3.4, "/illustrations/worker-catalog.png"),
            ("AMIT-LINEN-TR", "SELLER_AMIT_03", "Linen Summer Trousers White", "Breathable linen trousers.", 22, 3.7, "/illustrations/content-woman.png"),
            ("AMIT-POLO-NAVY", "SELLER_AMIT_03", "Navy Blue Polo T-Shirt", "Classic fit polo.", 15, 4.2, "/illustrations/shopping-sprint.png"),
            ("AMIT-DENIM-JAC", "SELLER_AMIT_03", "Vintage Denim Jacket", "Rugged wash denim.", 18, 4.0, "/illustrations/worker-catalog.png"),
            ("AMIT-CARGO-PNT", "SELLER_AMIT_03", "Olive Cargo Pants", "6-pocket utility cargos.", 32, 3.2, "/illustrations/shopping-woman.png"),

            # SELLER 3: Rajesh Luxe Bangles
            ("RAJ-BGL-GOLD", "SELLER_RAJESH_01", "Gold Plated Bridal Bangles", "Set of 4 traditional bangles.", 14, 4.5, "/illustrations/shopping-sprint.png"),
            ("RAJ-KADA-SILV", "SELLER_RAJESH_01", "Oxidized Silver Kada", "Tribal design heavy kada.", 25, 3.6, "/illustrations/content-woman.png"),
            ("RAJ-CHURA-RED", "SELLER_RAJESH_01", "Punjabi Red Chura Set", "Bridal acrylic chura.", 8, 4.8, "/illustrations/worker-catalog.png"),
            ("RAJ-BGL-GLASS", "SELLER_RAJESH_01", "Multicolor Glass Bangles", "Daily wear glass bangles.", 38, 3.0, "/illustrations/shopping-woman.png"),
            ("RAJ-BRACE-ROSE", "SELLER_RAJESH_01", "Rose Gold Bracelet", "Minimalist office wear bracelet.", 20, 3.9, "/illustrations/shopping-sprint.png"),

            # SELLER 4: Kiran Urban Smart
            ("KIR-SMART-WTCH", "SELLER_KIRAN_02", "Urban Pro Smartwatch", "Fitness tracker with heart monitor.", 29, 3.3, "/illustrations/worker-catalog.png"),
            ("KIR-TWS-PODS", "SELLER_KIRAN_02", "BassPro TWS Earbuds", "Wireless earbuds with ANC.", 18, 4.1, "/illustrations/content-woman.png"),
            ("KIR-PWR-BANK", "SELLER_KIRAN_02", "10000mAh Power Bank", "Fast charging slim power bank.", 12, 4.4, "/illustrations/shopping-sprint.png"),
            ("KIR-SPKR-MINI", "SELLER_KIRAN_02", "Mini Bluetooth Speaker", "Waterproof portable speaker.", 35, 3.1, "/illustrations/shopping-woman.png"),
            ("KIR-CBL-TYPEC", "SELLER_KIRAN_02", "Braided Type-C Cable", "Durable 2m charging cable.", 5, 4.7, "/illustrations/worker-catalog.png"),

            # SELLER 5: Sneha Handloom House
            ("SNE-BED-FLORAL", "SELLER_SNEHA_04", "Floral Cotton Bedsheet", "King size with 2 pillow covers.", 22, 3.8, "/illustrations/content-woman.png"),
            ("SNE-CUSH-BOHO", "SELLER_SNEHA_04", "Boho Embroidered Cushion", "Set of 5 cushion covers.", 15, 4.2, "/illustrations/shopping-sprint.png"),
            ("SNE-RUG-JUTE", "SELLER_SNEHA_04", "Handwoven Jute Rug", "Eco-friendly round rug.", 28, 3.5, "/illustrations/worker-catalog.png"),
            ("SNE-CURT-BLK", "SELLER_SNEHA_04", "Blackout Window Curtains", "Set of 2 thermal insulated.", 10, 4.6, "/illustrations/shopping-woman.png"),
            ("SNE-TOWEL-BATH", "SELLER_SNEHA_04", "Plush Bath Towel Set", "100% cotton quick dry.", 31, 3.2, "/illustrations/shopping-sprint.png")
        ]

        insert_query = """
            INSERT INTO products (product_id, seller_id, name, description, return_rate, rating, raw_reviews, image_url)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """

        enriched_data = [
            (*row[:6], json.dumps(mock_reviews_pool[i % len(mock_reviews_pool)]), row[6])
            for i, row in enumerate(seed_data)
        ]
        
        cursor.executemany(insert_query, enriched_data)
        conn.commit()
        
        print("✅ Database successfully reset! You now have 25 perfect products across 5 sellers.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Error during seed: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    reset_and_seed_database()