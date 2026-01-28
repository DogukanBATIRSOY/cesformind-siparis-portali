import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  data?: Record<string, any>;

  constructor(message: string, statusCode: number, data?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.data = data;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.data && { data: err.data }),
    });
  }

  // Prisma hataları
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    if (prismaError.code === 'P2002') {
      const field = prismaError.meta?.target;
      let message = 'Bu kayıt zaten mevcut';
      
      // Alan bazlı hata mesajları
      if (field) {
        const fieldMessages: Record<string, string> = {
          'User_email_key': 'Bu email adresi zaten kullanılıyor',
          'User_phone_key': 'Bu telefon numarası zaten kullanılıyor',
          'Customer_code_key': 'Bu müşteri kodu zaten kullanılıyor',
          'Customer_taxNumber_key': 'Bu vergi numarası zaten kayıtlı',
          'Product_sku_key': 'Bu stok kodu zaten kullanılıyor',
          'Product_barcode_key': 'Bu barkod zaten kullanılıyor',
        };
        
        const fieldKey = Array.isArray(field) ? field[0] : field;
        message = fieldMessages[fieldKey] || `Bu ${fieldKey} zaten mevcut`;
      }
      
      return res.status(400).json({
        success: false,
        message,
        field,
      });
    }

    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı',
      });
    }
  }

  // Validation hataları
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Doğrulama hatası',
      errors: (err as any).errors,
    });
  }

  // JWT hataları
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token süresi dolmuş',
    });
  }

  // Genel hata
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Sunucu hatası' 
      : err.message,
  });
};
