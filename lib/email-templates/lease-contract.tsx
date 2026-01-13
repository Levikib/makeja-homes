import * as React from 'react';

interface LeaseContractEmailProps {
  tenantName: string;
  propertyName: string;
  unitNumber: string;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  signatureLink: string;
}

export const LeaseContractEmail = ({
  tenantName,
  propertyName,
  unitNumber,
  monthlyRent,
  startDate,
  endDate,
  signatureLink,
}: LeaseContractEmailProps) => (
  <html>
    <head>
      <meta charSet="utf-8" />
    </head>
    <body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f4f4', padding: '20px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '30px', textAlign: 'center' }}>
          <h1 style={{ color: '#ffffff', margin: '0', fontSize: '28px' }}>🏠 Makeja Homes</h1>
          <p style={{ color: '#e0e7ff', margin: '10px 0 0 0', fontSize: '16px' }}>Property Management</p>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 30px' }}>
          <h2 style={{ color: '#1f2937', marginTop: '0' }}>Hello {tenantName}! 👋</h2>
          
          <p style={{ color: '#4b5563', fontSize: '16px', lineHeight: '1.6' }}>
            Your lease agreement is ready for review and signature. Please review the details below and sign digitally to activate your lease.
          </p>

          {/* Lease Details Card */}
          <div style={{ backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '20px', margin: '30px 0' }}>
            <h3 style={{ color: '#1f2937', marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #667eea', paddingBottom: '10px' }}>
              📋 Lease Details
            </h3>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px', display: 'block' }}>Property</span>
                <span style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>{propertyName}</span>
              </div>
              
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px', display: 'block' }}>Unit</span>
                <span style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>Unit {unitNumber}</span>
              </div>
              
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px', display: 'block' }}>Monthly Rent</span>
                <span style={{ color: '#059669', fontSize: '20px', fontWeight: 'bold' }}>KSH {monthlyRent.toLocaleString()}</span>
              </div>
              
              <div>
                <span style={{ color: '#6b7280', fontSize: '14px', display: 'block' }}>Lease Period</span>
                <span style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold' }}>{startDate} - {endDate}</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div style={{ textAlign: 'center', margin: '40px 0' }}>
            <a 
              href={signatureLink}
              style={{
                display: 'inline-block',
                backgroundColor: '#667eea',
                color: '#ffffff',
                padding: '16px 32px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: '0 4px 6px rgba(102, 126, 234, 0.3)'
              }}
            >
              📝 Review & Sign Lease Agreement
            </a>
          </div>

          {/* Important Notice */}
          <div style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '15px', borderRadius: '4px', margin: '30px 0' }}>
            <p style={{ margin: '0', color: '#92400e', fontSize: '14px' }}>
              ⚠️ <strong>Important:</strong> This link is unique to you and valid for the duration of your lease. Please keep it secure and do not share it with others.
            </p>
          </div>

          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6' }}>
            If you have any questions about your lease agreement, please contact our office at support@makejahomes.com or reply to this email.
          </p>
        </div>

        {/* Footer */}
        <div style={{ backgroundColor: '#f9fafb', padding: '20px 30px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ color: '#6b7280', fontSize: '12px', margin: '0', textAlign: 'center' }}>
            © {new Date().getFullYear()} Makeja Homes. All rights reserved.
          </p>
          <p style={{ color: '#9ca3af', fontSize: '11px', margin: '10px 0 0 0', textAlign: 'center' }}>
            This is an automated message. Please do not reply directly to this email.
          </p>
        </div>
      </div>
    </body>
  </html>
);
