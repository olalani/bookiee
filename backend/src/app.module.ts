import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ProductsModule } from './modules/products/products.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TeamModule } from './modules/team/team.module';
import { DeadLetterModule } from './modules/dead-letter/dead-letter.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    TransactionsModule,
    CategoriesModule,
    WhatsappModule,
    ReceiptsModule,
    ProductsModule,
    InvoicesModule,
    PayrollModule,
    DashboardModule,
    TeamModule,
    DeadLetterModule,
  ],
})
export class AppModule {}
