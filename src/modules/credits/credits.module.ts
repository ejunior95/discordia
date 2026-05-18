import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsService } from './credits.service';
import { CreditsController } from './credits.controller';
import { CreditsGuard } from './credits.guard';
import { CreditsBalanceInterceptor } from './credits-balance.interceptor';
import { CreditsRefundInterceptor } from './credits-refund.interceptor';
import { CreditWallet } from './entities/credit-wallet.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { User } from '../users/entities/user.entity';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditWallet, CreditTransaction, User]),
    BillingModule,
  ],
  controllers: [CreditsController],
  providers: [
    CreditsService,
    CreditsGuard,
    CreditsBalanceInterceptor,
    CreditsRefundInterceptor,
  ],
  exports: [
    CreditsService,
    CreditsGuard,
    CreditsBalanceInterceptor,
    CreditsRefundInterceptor,
  ],
})
export class CreditsModule {}
