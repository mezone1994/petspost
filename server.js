const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('🐾 Starting PetPost server...');

// Middleware
app.use(express.static('.'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//  AWS SDK 
AWS.config.update({
    region: process.env.AWS_DEFAULT_REGION || 'eu-west-1'
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'marvelbase-images';

console.log(`🌍 AWS Region: ${AWS.config.region}`);
console.log(`🪣 S3 Bucket: ${BUCKET_NAME}`);

//  multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Helper function to read pets data
function readPets() {
    try {
        const data = fs.readFileSync('pets.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('No pets file found, starting with empty array');
        return [];
    }
}

// Helper function to write pets data
function writePets(pets) {
    fs.writeFileSync('pets.json', JSON.stringify(pets, null, 2));
    console.log('Pets data saved to file');
}

// API Routes

// Get all pets
app.get('/api/pets', (req, res) => {
    console.log('📖 Getting all pets');
    try {
        const pets = readPets();
        console.log(`Found ${pets.length} pets`);
        res.json(pets);
    } catch (error) {
        console.error('Error reading pets:', error);
        res.status(500).json({ error: 'Failed to read pets data' });
    }
});

// Get single pet
app.get('/api/pets/:id', (req, res) => {
    try {
        const pets = readPets();
        const pet = pets.find(p => p.id === req.params.id);
        
        if (!pet) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        res.json(pet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read pet data' });
    }
});

// Add new pet
app.post('/api/pets', upload.single('image'), async (req, res) => {
    console.log('➕ Adding new pet');
    console.log('Form data:', req.body);
    console.log('File:', req.file ? req.file.originalname : 'No file');
    
    try {
        const {
            name,
            age,
            breed,
            description,
            size,
            gender
        } = req.body;

        // Validate required fields
        if (!name || !age || !breed) {
            return res.status(400).json({ 
                error: 'Pet name, age, and breed are required!' 
            });
        }

        let imageUrl = '';
        
        // Upload image to S3 
        if (req.file) {
            try {
                const fileExtension = path.extname(req.file.originalname);
                const s3Key = `pets/${uuidv4()}${fileExtension}`;
                
                const uploadParams = {
                    Bucket: BUCKET_NAME,
                    Key: s3Key,
                    Body: fs.createReadStream(req.file.path),
                    ContentType: req.file.mimetype,
                    ACL: 'public-read'
                };
                
                console.log('📤 Uploading to S3:', s3Key);
                const s3Result = await s3.upload(uploadParams).promise();
                imageUrl = s3Result.Location;
                console.log('✅ Image uploaded successfully:', imageUrl);
                
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                
            } catch (s3Error) {
                console.error('❌ S3 upload failed:', s3Error.message);
                const newFileName = `${Date.now()}-${req.file.originalname}`;
                const newPath = path.join('uploads', newFileName);
                fs.renameSync(req.file.path, newPath);
                imageUrl = `/uploads/${newFileName}`;
                console.log('📁 Falling back to local storage:', imageUrl);
            }
        }

        // Read existing pets
        const pets = readPets();

        // Create new pet
        const newPet = {
            id: uuidv4(),
            name: name.trim(),
            age: parseInt(age),
            breed: breed.trim(),
            description: description?.trim() || '',
            size: size?.trim() || '',
            gender: gender?.trim() || '',
            imageUrl: imageUrl,
            createdAt: new Date().toISOString(),
            status: 'Available'
        };

        // Add to pets array
        pets.push(newPet);

        // Save to file
        writePets(pets);

        console.log('✅ Pet added successfully:', newPet.name);
        res.json({ success: true, pet: newPet });

    } catch (error) {
        console.error('❌ Error adding pet:', error);
        
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ error: 'Failed to add pet: ' + error.message });
    }
});

// Update pet
app.put('/api/pets/:id', (req, res) => {
    try {
        const pets = readPets();
        const petIndex = pets.findIndex(p => p.id === req.params.id);
        
        if (petIndex === -1) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        // Update pet data
        pets[petIndex] = { ...pets[petIndex], ...req.body, updatedAt: new Date().toISOString() };
        writePets(pets);
        
        res.json({ success: true, pet: pets[petIndex] });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update pet' });
    }
});

// Delete pet
app.delete('/api/pets/:id', (req, res) => {
    try {
        const pets = readPets();
        const petIndex = pets.findIndex(p => p.id === req.params.id);
        
        if (petIndex === -1) {
            return res.status(404).json({ error: 'Pet not found' });
        }
        
        const deletedPet = pets.splice(petIndex, 1)[0];
        writePets(pets);
        
        res.json({ success: true, pet: deletedPet });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete pet' });
    }
});

app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'PetPost server is running!',
        region: AWS.config.region,
        bucket: BUCKET_NAME,
        timestamp: new Date().toISOString() 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`PetPost server is running!`);
    console.log(`Open your browser and go to: http://localhost:${PORT}`);
});