import React from 'react';
import { ComplianceReportsContent } from './ComplianceReportsContent';
import { FileText } from 'lucide-react';

export const PTReportsContent: React.FC = () => (
  <ComplianceReportsContent type="PT" title="PT Returns" icon={FileText} color="bg-purple-500" />
);
