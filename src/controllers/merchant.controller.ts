import { Request, Response } from 'express';
import { merchantRepository } from '../repositories/merchant.repository.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { STATUS_CODES } from '../constants/statusCodes.js';
import { NotFoundError } from '../utils/apiError.js';

export const getMerchants = async (req: Request, res: Response): Promise<Response> => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;

  const result = await merchantRepository.findMerchantsPaginated(page, limit);

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Merchants retrieved successfully',
    data: result.data,
    meta: {
      total: result.total,
      pages: result.pages,
      page,
      limit,
    },
  });
};

export const getMerchantById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const merchant = await merchantRepository.findById(id);
  if (!merchant) {
    throw new NotFoundError(`Merchant with ID "${id}" was not found`);
  }

  return ApiResponse.success({
    res,
    statusCode: STATUS_CODES.OK,
    message: 'Merchant profile retrieved successfully',
    data: merchant,
  });
};
