'use client';

import { useState } from 'react';
import { CREDIT_PACKAGES, getTotalCredits, type PackageId } from '@/lib/credit-pricing';

interface CreditsPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsPurchaseModal({ isOpen, onClose }: CreditsPurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePurchase = async (packageId: PackageId) => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Purchase error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process purchase');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Purchase Credits</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            disabled={isProcessing}
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(CREDIT_PACKAGES) as PackageId[]).map((packageId) => {
              const pkg = CREDIT_PACKAGES[packageId];
              const totalCredits = getTotalCredits(packageId);
              const pricePerCredit = (pkg.price / 100 / totalCredits).toFixed(3);

              return (
                <div
                  key={packageId}
                  className="border-2 border-gray-200 rounded-xl p-6 hover:border-blue-500 transition-all hover:shadow-lg flex flex-col"
                >
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      ${(pkg.price / 100).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${pricePerCredit} per credit
                    </div>
                  </div>

                  <div className="flex-1 mb-4">
                    <div className="text-center mb-3">
                      <div className="text-2xl font-bold text-gray-900">{pkg.credits}</div>
                      <div className="text-sm text-gray-600">Base Credits</div>
                    </div>

                    {pkg.bonus > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="text-green-700 font-bold">+{pkg.bonus} Bonus!</div>
                        <div className="text-sm text-green-600">
                          Total: {totalCredits} credits
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handlePurchase(packageId)}
                    disabled={isProcessing}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isProcessing ? 'Processing...' : 'Purchase'}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">What are credits?</h4>
            <p className="text-sm text-blue-800">
              Each credit allows you to generate one word search puzzle. Credits never expire and can be used anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
