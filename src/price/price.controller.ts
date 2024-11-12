import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from '@nestjs/swagger';

import { PriceService } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  @ApiOperation({ summary: 'Get hourly prices within the last 24 hours' })
  @ApiResponse({
    status: 200,
    description:
      'Returns an array of prices within the last 24 hours, sorted by hour.',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getAllPrices() {
    return this.priceService.getAllPrices();
  }

  @Post('alert')
  @ApiOperation({
    summary: 'Set a price alert for a specific chain and threshold',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chain: {
          type: 'string',
          description:
            'The blockchain chain name (e.g., "ethereum" or "polygon")',
        },
        threshold: {
          type: 'number',
          description: 'The price threshold to trigger the alert',
        },
        email: {
          type: 'string',
          description: 'Email address to receive the alert notification',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'The alert has been successfully created.',
  })
  async createAlert(
    @Body('chain') chain: string,
    @Body('threshold') threshold: number,
    @Body('email') email: string,
  ) {
    return this.priceService.createAlert(chain, threshold, email);
  }
}
