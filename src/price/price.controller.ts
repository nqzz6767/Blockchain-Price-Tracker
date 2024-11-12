import { Controller, Get, Post, Body } from '@nestjs/common';
import { PriceService } from './price.service';

@Controller('prices')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  async getAllPrices() {
    return this.priceService.getAllPrices();
  }

  @Post('alert')
  async createAlert(
    @Body('chain') chain: string,
    @Body('threshold') threshold: number,
    @Body('email') email: string,
  ) {
    return this.priceService.createAlert(chain, threshold, email);
  }
}
