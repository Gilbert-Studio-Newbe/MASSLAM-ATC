'use client';

import { useEffect } from 'react';
import SpanTables from '../../components/SpanTables';

export default function SpanTablesPage() {
  useEffect(() => {
    // Initialize page
    console.log('Span Tables page loaded');
  }, []);

  return <SpanTables />;
} 