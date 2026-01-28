import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Upload klasörünü oluştur
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Base64 resim yükleme (multer alternatifi)
router.post('/image', authenticate, async (req, res) => {
  try {
    const { image, filename: originalFilename } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Resim verisi gerekli',
      });
    }

    // Base64 verisini çöz
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz resim formatı',
      });
    }

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Dosya boyutu kontrolü (5MB)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: 'Dosya boyutu 5MB\'dan küçük olmalı',
      });
    }

    // Benzersiz dosya adı oluştur
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const filename = `${uniqueId}.${ext}`;
    const filepath = path.join(uploadDir, filename);

    // Dosyayı kaydet
    fs.writeFileSync(filepath, buffer);

    const imageUrl = `/uploads/${filename}`;

    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename,
        originalname: originalFilename || filename,
        size: buffer.length,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Resim yüklenirken hata oluştu',
    });
  }
});

// Resim silme
router.delete('/image/:filename', authenticate, (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(uploadDir, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }

    res.json({
      success: true,
      message: 'Resim silindi',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Resim silinirken hata oluştu',
    });
  }
});

export default router;
