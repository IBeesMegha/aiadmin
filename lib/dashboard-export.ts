/**
 * Dashboard Export Utilities
 * Functions to export dashboard data in various formats
 */

export interface DashboardData {
  overview: any;
  growth: any;
  collectionTypes: any[];
  userDistribution: any[];
  mediaDistribution: any[];
  recentUsers: any[];
  recentMedia: any[];
  activityChart: any[];
}

/**
 * Export dashboard data as CSV
 */
export function exportToCSV(data: DashboardData): string {
  const lines: string[] = [];

  // Overview section
  lines.push('OVERVIEW');
  lines.push('Metric,Value');
  Object.entries(data.overview).forEach(([key, value]) => {
    lines.push(`${key},${value}`);
  });
  lines.push('');

  // Growth section
  lines.push('GROWTH (30 Days)');
  lines.push('Metric,Change %');
  Object.entries(data.growth).forEach(([key, value]) => {
    lines.push(`${key},${value}%`);
  });
  lines.push('');

  // Collection Types
  if (data.collectionTypes.length > 0) {
    lines.push('COLLECTION TYPES');
    lines.push('Name,Display Name,Entry Count');
    data.collectionTypes.forEach((ct) => {
      lines.push(`${ct.name},${ct.displayName},${ct.entryCount}`);
    });
    lines.push('');
  }

  // User Distribution
  if (data.userDistribution.length > 0) {
    lines.push('USER DISTRIBUTION');
    lines.push('Role,Count');
    data.userDistribution.forEach((ud) => {
      lines.push(`${ud.role},${ud.count}`);
    });
    lines.push('');
  }

  // Media Distribution
  if (data.mediaDistribution.length > 0) {
    lines.push('MEDIA DISTRIBUTION');
    lines.push('Type,Count');
    data.mediaDistribution.forEach((md) => {
      lines.push(`${md.type},${md.count}`);
    });
    lines.push('');
  }

  // Activity Chart
  if (data.activityChart.length > 0) {
    lines.push('ACTIVITY (14 Days)');
    lines.push('Date,Activity Count');
    data.activityChart.forEach((ac) => {
      lines.push(`${ac.date},${ac.activity}`);
    });
  }

  return lines.join('\n');
}

/**
 * Export dashboard data as JSON
 */
export function exportToJSON(data: DashboardData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Download file to user's computer
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export dashboard as CSV file
 */
export function exportDashboardAsCSV(data: DashboardData) {
  const csv = exportToCSV(data);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(csv, `dashboard-report-${timestamp}.csv`, 'text/csv');
}

/**
 * Export dashboard as JSON file
 */
export function exportDashboardAsJSON(data: DashboardData) {
  const json = exportToJSON(data);
  const timestamp = new Date().toISOString().split('T')[0];
  downloadFile(json, `dashboard-report-${timestamp}.json`, 'application/json');
}

/**
 * Generate summary text report
 */
export function generateSummaryReport(data: DashboardData): string {
  const lines: string[] = [];
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  lines.push('═══════════════════════════════════════════');
  lines.push('         CMS DASHBOARD REPORT');
  lines.push(`         Generated: ${date}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');

  lines.push('OVERVIEW');
  lines.push('─────────────────────────────────────────');
  lines.push(`• Collection Types: ${data.overview.collections}`);
  lines.push(`• Single Types: ${data.overview.singles}`);
  lines.push(`• Components: ${data.overview.components}`);
  lines.push(`• Total Users: ${data.overview.users}`);
  lines.push(`• Roles: ${data.overview.roles}`);
  lines.push(`• Media Files: ${data.overview.media}`);
  lines.push(`• Storage Used: ${data.overview.storageUsedMB} MB`);
  lines.push('');

  lines.push('GROWTH METRICS (Last 30 Days)');
  lines.push('─────────────────────────────────────────');
  lines.push(`• Users: ${data.growth.users > 0 ? '+' : ''}${data.growth.users}%`);
  lines.push(`• Media: ${data.growth.media > 0 ? '+' : ''}${data.growth.media}%`);
  lines.push('');

  if (data.collectionTypes.length > 0) {
    lines.push('TOP COLLECTIONS BY ENTRIES');
    lines.push('─────────────────────────────────────────');
    const sorted = [...data.collectionTypes].sort((a, b) => b.entryCount - a.entryCount);
    sorted.slice(0, 5).forEach((ct, i) => {
      lines.push(`${i + 1}. ${ct.displayName}: ${ct.entryCount} entries`);
    });
    lines.push('');
  }

  if (data.userDistribution.length > 0) {
    lines.push('USER DISTRIBUTION');
    lines.push('─────────────────────────────────────────');
    data.userDistribution.forEach((ud) => {
      lines.push(`• ${ud.role}: ${ud.count} users`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════');
  lines.push('           END OF REPORT');
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Print dashboard report
 */
export function printDashboardReport(data: DashboardData) {
  const report = generateSummaryReport(data);
  const printWindow = window.open('', '_blank');
  
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Dashboard Report</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              white-space: pre-wrap;
              line-height: 1.6;
            }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>${report}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }
}
