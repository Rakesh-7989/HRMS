import React from 'react';
import { ComplianceReportsContent } from './ComplianceReportsContent';
import { Building2 } from 'lucide-react';

export const LWFReportsContent: React.FC = () => (
  <ComplianceReportsContent type="LWF" title="LWF Returns" icon={Building2} color="bg-teal-500" />
);
