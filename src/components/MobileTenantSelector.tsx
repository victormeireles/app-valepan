"use client";

import { useState } from "react";
import { useMultiTenant } from "@/hooks/useMultiTenant";

export default function MobileTenantSelector() {
  const { availableTenants, currentTenant, hasMultipleTenants, changeTenant, isChanging } = useMultiTenant();
  const [isOpen, setIsOpen] = useState(false);

  if (!hasMultipleTenants) {
    return null;
  }

  const handleTenantChange = async (tenantId: string) => {
    await changeTenant(tenantId);
    setIsOpen(false);
  };

  return (
    <div className="mobile-tenant-selector">
      <button
        className={`mobile-tenant-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isChanging}
      >
        <div className="mobile-tenant-inner">
          <span className="material-icons mobile-tenant-icon">business</span>
          <span className="mobile-tenant-label">
            {isChanging ? "Trocando..." : currentTenant.name || "Empresa"}
          </span>
          <span className={`material-icons mobile-tenant-arrow ${isOpen ? 'open' : ''}`}>
            expand_more
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="mobile-tenant-dropdown">
          {availableTenants.map((tenant) => (
            <button
              key={tenant.id}
              className={`mobile-tenant-option ${tenant.id === currentTenant.id ? 'active' : ''}`}
              onClick={() => handleTenantChange(tenant.id)}
              disabled={isChanging}
            >
              <span className="mobile-tenant-name">{tenant.name}</span>
              {tenant.id === currentTenant.id && (
                <span className="material-icons mobile-tenant-check">check</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .mobile-tenant-selector {
          margin: 0 6px 16px;
          position: relative;
        }

        .mobile-tenant-button {
          display: block;
          width: 100%;
          background: transparent;
          border: 0;
          text-align: left;
          padding: 0;
          cursor: pointer;
        }

        .mobile-tenant-inner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
        }

        .mobile-tenant-button:hover .mobile-tenant-inner {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .mobile-tenant-button.active .mobile-tenant-inner {
          background: rgba(230, 126, 34, 0.15);
          border-color: rgba(230, 126, 34, 0.3);
        }

        .mobile-tenant-icon {
          font-size: 20px;
          color: #e67e22;
        }

        .mobile-tenant-label {
          flex: 1;
          font-size: 15px;
          font-weight: 600;
          color: #c9d4ea;
          letter-spacing: 0.2px;
        }

        .mobile-tenant-arrow {
          font-size: 20px;
          color: #c9d4ea;
          transition: transform 0.2s ease;
        }

        .mobile-tenant-arrow.open {
          transform: rotate(180deg);
        }

        .mobile-tenant-dropdown {
          margin-top: 8px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .mobile-tenant-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 12px 14px;
          background: transparent;
          border: 0;
          color: #c9d4ea;
          text-align: left;
          transition: background 0.2s ease;
        }

        .mobile-tenant-option:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .mobile-tenant-option.active {
          background: rgba(230, 126, 34, 0.1);
          color: #ffd9b3;
        }

        .mobile-tenant-name {
          font-size: 14px;
          font-weight: 500;
          flex: 1;
        }

        .mobile-tenant-check {
          font-size: 18px;
          color: #e67e22;
        }
      `}</style>
    </div>
  );
}
