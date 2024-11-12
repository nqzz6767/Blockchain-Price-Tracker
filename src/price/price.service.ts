import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Price } from './entities/price.entity';
import { Alert } from './entities/alert.entity';
import * as nodemailer from 'nodemailer';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MoralisService } from 'nestjs-moralis';
import { EvmChain } from '@moralisweb3/common-evm-utils';

@Injectable()
export class PriceService {
  constructor(
    private readonly moralisService: MoralisService,
    @InjectRepository(Price) private priceRepo: Repository<Price>,
    @InjectRepository(Alert) private alertRepo: Repository<Alert>,
  ) {}

  async fetchPrice(chain: string): Promise<number> {
    console.log('fetchPrice', chain);
    let tokenAddress: string;
    let supportedChain;
    if (chain === 'ethereum') {
      tokenAddress = process.env.WETH_ADDRESS;
      supportedChain = EvmChain.ETHEREUM;
    } else if (chain === 'polygon') {
      tokenAddress = process.env.WMATIC_ADDRESS;
      supportedChain = EvmChain.POLYGON;
    } else {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const response = await this.moralisService.EvmApi.token.getTokenPrice({
      address: tokenAddress,
      chain: supportedChain,
    });
    return response.toJSON().usdPrice;
  }

  // Save the price of the specified chain and check for any alerts
  async savePrice(chain: string): Promise<void> {
    const price = await this.fetchPrice(chain);
    await this.priceRepo.save({ chain, price });
    await this.checkPriceIncrease(chain);
    await this.checkAlerts(chain, price);
  }

  // Check for a 3% price increase over the last hour and send an email alert if conditions are met
  async checkPriceIncrease(chain: string) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oldPrice = await this.priceRepo.findOne({
      where: { chain, timestamp: MoreThanOrEqual(oneHourAgo) },
      order: { timestamp: 'ASC' },
    });
    const latestPrice = await this.priceRepo.findOne({
      where: { chain },
      order: { timestamp: 'DESC' },
    });

    if (oldPrice && latestPrice) {
      const priceChange =
        ((latestPrice.price - oldPrice.price) / oldPrice.price) * 100;
      if (priceChange > 3) {
        await this.sendEmail(
          'hyperhire_assignment@hyperhire.in',
          `Alert: ${chain} price increased by more than 3% in the last hour`,
        );
      }
    }
  }

  // Check if any alerts are met based on the latest price
  async checkAlerts(chain: string, currentPrice: number) {
    const alerts = await this.alertRepo.find({ where: { chain } });
    for (const alert of alerts) {
      if (currentPrice >= alert.threshold) {
        await this.sendEmail(
          alert.email,
          `Price alert: ${chain} reached ${currentPrice}`,
        );
      }
    }
  }

  // Send email notifications
  async sendEmail(to: string, subject: string) {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: subject,
    });
  }

  // Retrieve all prices within the last 24 hours
  async getAllPrices(): Promise<Price[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.priceRepo.find({
      where: { timestamp: MoreThanOrEqual(oneDayAgo) },
      order: { timestamp: 'DESC' },
    });
  }

  // Create a price alert with a specified threshold and email
  async createAlert(
    chain: string,
    threshold: number,
    email: string,
  ): Promise<Alert> {
    const alert = this.alertRepo.create({ chain, threshold, email });
    return this.alertRepo.save(alert);
  }

  // Schedule job to fetch and save prices every 5 minutes for Ethereum and Polygon
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    await this.savePrice('ethereum');
    await this.savePrice('polygon');
  }
}
