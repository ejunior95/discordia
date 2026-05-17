import {
  Controller,
  Get,
  InternalServerErrorException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { BillingService } from './billing.service';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import {
  InvoiceResponseDto,
  PaymentMethodResponseDto,
  PlanResponseDto,
  SubscriptionResponseDto,
} from './dtos/billing-response.dto';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('/plans')
  async listPlans(): Promise<PlanResponseDto[]> {
    try {
      const plans = await this.billingService.listActivePlans();
      return plans.map((p) =>
        plainToInstance(PlanResponseDto, p, { excludeExtraneousValues: true }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao listar planos - ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/subscription/me')
  async getMySubscription(
    @CurrentUser() user: { id: string },
  ): Promise<SubscriptionResponseDto> {
    try {
      const data = await this.billingService.getActiveSubscription(user.id);
      return plainToInstance(SubscriptionResponseDto, data, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao obter assinatura - ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/invoices/me')
  async getMyInvoices(
    @CurrentUser() user: { id: string },
  ): Promise<InvoiceResponseDto[]> {
    try {
      const invoices = await this.billingService.listInvoices(user.id);
      return invoices.map((i) =>
        plainToInstance(InvoiceResponseDto, i, { excludeExtraneousValues: true }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao listar faturas - ${(error as Error).message}`,
      );
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('/payment-method/me')
  async getMyPaymentMethod(
    @CurrentUser() user: { id: string },
  ): Promise<PaymentMethodResponseDto | null> {
    try {
      const pm = await this.billingService.getDefaultPaymentMethod(user.id);
      if (!pm) return null;
      return plainToInstance(PaymentMethodResponseDto, pm, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Erro ao obter método de pagamento - ${(error as Error).message}`,
      );
    }
  }
}
