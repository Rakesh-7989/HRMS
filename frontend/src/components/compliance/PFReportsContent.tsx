import React from 'react';
import { ComplianceReportsContent } from './ComplianceReportsContent';
import { Shield } from 'lucide-react';

export const PFReportsContent: React.FC = () => (
  <ComplianceReportsContent type="PF" title="PF Returns" icon={Shield} color="bg-orange-500" />
);
