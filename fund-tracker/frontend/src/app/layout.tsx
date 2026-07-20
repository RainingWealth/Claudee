import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fund Tracker & Presenter",
  description:
    "Client-facing fund performance tracker. Educational use only — not financial advice.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <a href="/" className="flex items-center gap-2 font-semibold text-gray-900">
                <span className="text-blue-600 text-lg">◈</span>
                <span>Fund Tracker</span>
              </a>
              <nav className="flex items-center gap-4 text-sm">
                <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
                <a href="/portfolio" className="text-gray-600 hover:text-gray-900">Portfolios</a>
                <a href="/upload" className="text-gray-600 hover:text-gray-900">Upload CSV</a>
              </nav>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <p className="text-xs text-gray-400 text-center">
              Fund Tracker & Presenter — For educational and informational purposes only.
              Not investment advice. Past performance does not guarantee future results.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
