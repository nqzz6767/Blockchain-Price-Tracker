import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoralisModule } from 'nestjs-moralis';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { Price } from './entities/price.entity';
import { Alert } from './entities/alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Price, Alert]),
    MoralisModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          apiKey: configService.get<string>('MORALIS_API_KEY'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [PriceController],
  providers: [PriceService],
})
export class PriceModule {}
