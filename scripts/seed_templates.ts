
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const TEMPLATES = [
    {
        name: "Amsterdam Split Story",
        category: "food",
        thumbnail_url: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=400&h=400&fit=crop",
        canvas_state: [
            // Top Image (Background 1)
            {
                id: "img_top",
                type: "image",
                x: 0,
                y: 0,
                width: 1080,
                height: 960,
                rotation: 0,
                opacity: 1,
                src: "https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=1080&h=960&fit=crop"
            },
            // Bottom Image (Background 2)
            {
                id: "img_bottom",
                type: "image",
                x: 0,
                y: 960,
                width: 1080,
                height: 960,
                rotation: 0,
                opacity: 1,
                src: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1080&h=960&fit=crop"
            },
            // Text: AMSTERDAM DINNER
            {
                id: "txt_title",
                type: "text",
                content: "AMSTERDAM DINNER",
                x: 80,
                y: 850,
                fontSize: 64,
                fontFamily: "Inter, sans-serif",
                color: "#FDE68A", // Light yellow
                fontWeight: "bold",
                rotation: 0,
                opacity: 1
            },
            // Text: Ideas and Prices
            {
                id: "txt_subtitle",
                type: "text",
                content: "Ideas and Prices",
                x: 80,
                y: 920,
                fontSize: 56,
                fontFamily: "serif",
                color: "#F97316", // Orange
                fontWeight: "normal",
                rotation: 0,
                opacity: 1
            },
            // Text: HOMEMADE Badge
            {
                id: "txt_badge",
                type: "text",
                content: "HOMEMADE",
                x: 450,
                y: 1800,
                fontSize: 32,
                fontFamily: "Inter, sans-serif",
                color: "#FFFFFF",
                fontWeight: "bold",
                rotation: 0,
                opacity: 1
            }
        ],
        slots_config: [
            { id: "slot_1", targetElementId: "img_top", description: "Chef or Kitchen Context" },
            { id: "slot_2", targetElementId: "img_bottom", description: "Food Close-up" }
        ]
    },
    {
        name: "Product Spotlight (Sarma)",
        category: "product",
        thumbnail_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop",
        canvas_state: [
            // Full Background Image
            {
                id: "img_bg",
                type: "image",
                x: 0,
                y: 0,
                width: 1080,
                height: 1920,
                rotation: 0,
                opacity: 1,
                src: "https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1080&h=1920&fit=crop"
            },
            // Text: SARMA
            {
                id: "txt_product",
                type: "text",
                content: "SARMA",
                x: 540, // Centered roughly
                y: 1500,
                fontSize: 120,
                fontFamily: "serif",
                color: "#FDE68A",
                fontWeight: "bold",
                rotation: 0,
                opacity: 1,
                textAlign: "center"
            },
            // Text: Price
            {
                id: "txt_price",
                type: "text",
                content: "€8",
                x: 540,
                y: 1650,
                fontSize: 100,
                fontFamily: "serif",
                color: "#FDE68A",
                fontWeight: "bold",
                rotation: 0,
                opacity: 1
            },
            // Text: Vertical Side
            {
                id: "txt_side",
                type: "text",
                content: "ORDER NOW",
                x: 60,
                y: 1500,
                fontSize: 48,
                fontFamily: "Inter, sans-serif",
                color: "#F97316",
                fontWeight: "bold",
                rotation: -90,
                opacity: 1
            }
        ],
        slots_config: [
            { id: "slot_bg", targetElementId: "img_bg", description: "Main Product Shot" }
        ]
    }
];

async function seed() {
    console.log('Seeding templates...');

    for (const t of TEMPLATES) {
        const { error } = await supabase.from('design_templates').insert(t);
        if (error) {
            console.error('Error inserting template:', t.name, error);
        } else {
            console.log('Inserted:', t.name);
        }
    }
}

seed();
