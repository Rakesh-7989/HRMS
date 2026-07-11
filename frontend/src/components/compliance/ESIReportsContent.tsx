import React from 'react';
import { ComplianceReportsContent } from './ComplianceReportsContent';
import { Activity } from 'lucide-react';

export const ESIReportsContent: React.FC = () => (
  <ComplianceReportsContent type="ESI" title="ESI Returns" icon={Activity} color="bg-green-500" />
);
