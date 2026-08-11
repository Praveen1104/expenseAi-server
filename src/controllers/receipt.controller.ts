import { Request, Response } from 'express';
import { receiptService } from '../services/receipt.service.js';
import { visionService } from '../services/vision.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { ValidationError, UnauthorizedError } from '../utils/apiError.js';
import { ReceiptStatus } from '../models/receipt.model.js';
import { AuthRequest } from '../middlewares/auth.middleware.js';

export const uploadReceipt = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  if (!req.file) {
    throw new ValidationError('No receipt image file provided in request (field: "file")');
  }

  const receipt = await receiptService.processUpload(req.file, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.CREATED,
    message: 'Receipt uploaded and queued for processing successfully',
    data: receipt,
  });
};

export const getReceipts = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const status = req.query.status as ReceiptStatus | undefined;

  const result = await receiptService.getReceipts(page, limit, status, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Receipts retrieved successfully',
    data: result.data,
    meta: {
      total: result.total,
      pages: result.pages,
      page,
      limit,
    },
  });
};

export const getReceiptById = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  const receipt = await receiptService.getReceiptById(id, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Receipt retrieved successfully',
    data: receipt,
  });
};

export const deleteReceipt = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  await receiptService.deleteReceipt(id, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Receipt deleted successfully',
  });
};

export const retryReceipt = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  const retriedReceipt = await receiptService.retryReceipt(id, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Receipt re-queued for processing successfully',
    data: retriedReceipt,
  });
};

export const processReceiptOCR = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  // Verify receipt ownership before initiating OCR pipeline (IDOR prevention)
  await receiptService.getReceiptById(id, authReq.user.userId);

  const extraction = await visionService.processReceiptOCR(id);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Receipt AI Vision OCR processing completed and Expense created',
    data: extraction,
  });
};

export const getReceiptExtraction = async (req: Request, res: Response): Promise<Response> => {
  const authReq = req as AuthRequest;
  if (!authReq.user) {
    throw new UnauthorizedError('User authentication details missing');
  }

  const { id } = req.params;
  const extraction = await visionService.getExtractionByReceiptId(id, authReq.user.userId);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Receipt extraction data retrieved successfully',
    data: extraction,
  });
};
