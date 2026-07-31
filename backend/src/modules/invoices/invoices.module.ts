import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [HttpModule, TransactionsModule],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
