import PDFDocument from 'pdfkit';
import { IExpense } from '../../models/expense.model.js';
import { SummaryStatsResult, CategoryBreakdownResult, MerchantLeaderboardResult } from '../analytics/aggregation.service.js';
import { BudgetWithUsage } from '../budget/budget.service.js';
import { AISummaryData } from './summary.service.js';

export class PDFService {
  /**
   * Generates a multi-page PDF document buffer containing:
   * 1. Cover Page
   * 2. Financial Summary
   * 3. Category Breakdown
   * 4. Merchant Leaderboard
   * 5. Budget Comparison
   * 6. Expense Table
   * 7. AI Executive Summary
   * 8. Footer on all pages
   */
  public static async generatePDF(
    reportTitle: string,
    summaryStats: SummaryStatsResult,
    expenses: IExpense[],
    categories: CategoryBreakdownResult[],
    merchants: MerchantLeaderboardResult[],
    budgets: BudgetWithUsage[],
    aiSummary?: AISummaryData
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers: Buffer[] = [];

        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // Colors
        const primaryColor = '#1E293B'; // Slate 800
        const accentColor = '#3B82F6';  // Blue 500
        const lightBg = '#F8FAFC';      // Slate 50

        // Helper: Footer
        const addFooter = () => {
          doc
            .fontSize(8)
            .fillColor('#94A3B8')
            .text(
              `SmartSpend AI Enterprise Report • Generated ${new Date().toISOString()}`,
              40,
              790,
              { align: 'center' }
            );
        };

        // PAGE 1: Cover Page
        doc.rect(0, 0, 595, 842).fill(primaryColor);
        doc.fillColor('#FFFFFF').fontSize(28).text('SMARTSPEND AI', 40, 200, { align: 'center' });
        doc.fontSize(20).fillColor('#93C5FD').text('ENTERPRISE FINANCIAL REPORT', 40, 240, { align: 'center' });
        doc.fontSize(14).fillColor('#CBD5E1').text(reportTitle.toUpperCase(), 40, 280, { align: 'center' });
        doc.fontSize(10).fillColor('#94A3B8').text(`Date Generated: ${new Date().toLocaleDateString()}`, 40, 320, { align: 'center' });
        doc.fontSize(10).fillColor('#94A3B8').text('Strictly Confidential • Deterministic Audit System', 40, 750, { align: 'center' });

        // PAGE 2: Financial Summary & AI Executive Summary
        doc.addPage();
        addFooter();

        doc.fontSize(18).fillColor(primaryColor).text('Executive Financial Summary', 40, 40);
        doc.moveTo(40, 65).lineTo(555, 65).strokeColor(accentColor).lineWidth(2).stroke();

        // Summary Boxes
        doc.rect(40, 80, 240, 70).fillAndStroke(lightBg, '#E2E8F0');
        doc.fillColor('#64748B').fontSize(10).text('TOTAL SPEND', 50, 90);
        doc.fillColor(primaryColor).fontSize(20).text(`$${summaryStats.totalAmount.toFixed(2)}`, 50, 110);

        doc.rect(310, 80, 245, 70).fillAndStroke(lightBg, '#E2E8F0');
        doc.fillColor('#64748B').fontSize(10).text('TOTAL TRANSACTIONS', 320, 90);
        doc.fillColor(primaryColor).fontSize(20).text(`${summaryStats.totalExpenses}`, 320, 110);

        doc.rect(40, 160, 240, 70).fillAndStroke(lightBg, '#E2E8F0');
        doc.fillColor('#64748B').fontSize(10).text('TOP CATEGORY', 50, 170);
        doc.fillColor(primaryColor).fontSize(16).text(summaryStats.topCategory, 50, 190);

        doc.rect(310, 160, 245, 70).fillAndStroke(lightBg, '#E2E8F0');
        doc.fillColor('#64748B').fontSize(10).text('TOP MERCHANT', 320, 170);
        doc.fillColor(primaryColor).fontSize(16).text(summaryStats.topMerchant, 320, 190);

        // AI Executive Summary Section
        if (aiSummary) {
          doc.fontSize(14).fillColor(primaryColor).text('AI Executive Commentary', 40, 250);
          doc.moveTo(40, 268).lineTo(555, 268).strokeColor('#CBD5E1').lineWidth(1).stroke();

          doc.fontSize(10).fillColor('#334155');
          doc.text(`• ${aiSummary.financialHighlights}`, 40, 280, { width: 515 });
          doc.text(`• ${aiSummary.topSpendingCategory}`, 40, 310, { width: 515 });
          doc.text(`• ${aiSummary.biggestSavingsOpportunity}`, 40, 340, { width: 515 });
          doc.text(`• ${aiSummary.monthlySummary}`, 40, 370, { width: 515 });

          if (aiSummary.actionableAdvice?.length > 0) {
            doc.fontSize(11).fillColor(accentColor).text('Actionable Financial Steps:', 40, 410);
            let y = 430;
            aiSummary.actionableAdvice.forEach((adv) => {
              doc.fontSize(9).fillColor('#475569').text(`- ${adv}`, 50, y, { width: 500 });
              y += 18;
            });
          }
        }

        // PAGE 3: Category & Merchant Breakdown & Budgets
        doc.addPage();
        addFooter();

        doc.fontSize(16).fillColor(primaryColor).text('Category & Merchant Breakdown', 40, 40);
        doc.moveTo(40, 60).lineTo(555, 60).strokeColor(accentColor).lineWidth(2).stroke();

        // Category Table
        doc.fontSize(11).fillColor(primaryColor).text('Category Breakdown', 40, 75);
        let catY = 95;
        doc.fontSize(9).fillColor('#64748B');
        doc.text('Category', 40, catY);
        doc.text('Amount ($)', 200, catY);
        doc.text('Count', 340, catY);
        doc.text('Share (%)', 460, catY);
        doc.moveTo(40, catY + 12).lineTo(555, catY + 12).stroke('#CBD5E1');

        catY += 18;
        categories.slice(0, 8).forEach((cat) => {
          doc.fontSize(9).fillColor('#334155');
          doc.text(cat.category, 40, catY);
          doc.text(`$${cat.totalAmount.toFixed(2)}`, 200, catY);
          doc.text(`${cat.count}`, 340, catY);
          doc.text(`${cat.percentage.toFixed(1)}%`, 460, catY);
          catY += 16;
        });

        // Merchant Leaderboard
        doc.fontSize(11).fillColor(primaryColor).text('Top Merchants', 40, catY + 15);
        let merY = catY + 35;
        doc.fontSize(9).fillColor('#64748B');
        doc.text('Merchant', 40, merY);
        doc.text('Total Spend ($)', 250, merY);
        doc.text('Visits', 450, merY);
        doc.moveTo(40, merY + 12).lineTo(555, merY + 12).stroke('#CBD5E1');

        merY += 18;
        merchants.slice(0, 6).forEach((mer) => {
          doc.fontSize(9).fillColor('#334155');
          doc.text(mer.merchant, 40, merY);
          doc.text(`$${mer.totalAmount.toFixed(2)}`, 250, merY);
          doc.text(`${mer.visitCount}`, 450, merY);
          merY += 16;
        });

        // Budget Status
        if (budgets.length > 0) {
          doc.fontSize(11).fillColor(primaryColor).text('Budget Health Snapshot', 40, merY + 15);
          let budY = merY + 35;
          doc.fontSize(9).fillColor('#64748B');
          doc.text('Budget Category', 40, budY);
          doc.text('Limit ($)', 180, budY);
          doc.text('Spent ($)', 280, budY);
          doc.text('Usage', 380, budY);
          doc.text('Status', 480, budY);
          doc.moveTo(40, budY + 12).lineTo(555, budY + 12).stroke('#CBD5E1');

          budY += 18;
          budgets.forEach((b) => {
            doc.fontSize(9).fillColor('#334155');
            doc.text(b.category, 40, budY);
            doc.text(`$${b.monthlyLimit}`, 180, budY);
            doc.text(`$${b.usage?.spent || 0}`, 280, budY);
            doc.text(`${b.usage?.usagePercent || 0}%`, 380, budY);
            doc.text(b.usage?.alertLevel || 'safe', 480, budY);
            budY += 16;
          });
        }

        // PAGE 4: Expense Ledger Table
        doc.addPage();
        addFooter();

        doc.fontSize(16).fillColor(primaryColor).text('Expense Transaction Ledger', 40, 40);
        doc.moveTo(40, 60).lineTo(555, 60).strokeColor(accentColor).lineWidth(2).stroke();

        let tableY = 75;
        doc.fontSize(9).fillColor('#64748B');
        doc.text('Date', 40, tableY);
        doc.text('Category', 110, tableY);
        doc.text('Merchant', 230, tableY);
        doc.text('Method', 370, tableY);
        doc.text('Amount ($)', 470, tableY);
        doc.moveTo(40, tableY + 12).lineTo(555, tableY + 12).stroke('#CBD5E1');

        tableY += 18;
        expenses.slice(0, 30).forEach((exp) => {
          if (tableY > 750) {
            doc.addPage();
            addFooter();
            tableY = 40;
          }
          doc.fontSize(8).fillColor('#334155');
          doc.text(new Date(exp.transactionDate).toISOString().split('T')[0], 40, tableY);
          doc.text(exp.category, 110, tableY, { width: 110 });
          doc.text(exp.merchant, 230, tableY, { width: 130 });
          doc.text(exp.paymentMethod, 370, tableY);
          doc.text(`$${exp.amount.toFixed(2)}`, 470, tableY);
          tableY += 15;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
