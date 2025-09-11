
import React, { useState, useEffect } from 'react';
import { useChefStore } from '@/stores/useChefStore';
import { OutreachLog, CONTACT_METHOD_CONFIG, RESPONSE_TYPE_CONFIG } from '@/types/chef';
import { Plus, Calendar, MessageCircle, Filter, Edit, Trash2 } from 'lucide-react';

interface OutreachLogViewProps {
  workspaceId: string;
}

export const OutreachLogView: React.FC<OutreachLogViewProps> = ({ workspaceId }) => {
  const { 
    outreachLogs, 
    chefs, 
    loading, 
    fetchOutreachLogs, 
    fetchChefs, 
    deleteOutreachLog 
  } = useChefStore(};
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLog, setEditingLog] = useState<OutreachLog | null>(null);
  const [filterContactMethod, setFilterContactMethod] = useState<string>('all');
  const [filterResponseType, setFilterResponseType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOutreachLogs(
