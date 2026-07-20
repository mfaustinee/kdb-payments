import React, { useState, useEffect } from 'react';
import { LicensedClient, ClientBranch } from '../types';
import { DBService } from '../services/db';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Building, 
  Phone, 
  User, 
  MapPin, 
  FileText, 
  Sparkles,
  Calendar,
  Layers,
  ThermometerSnowflake,
  Activity,
  ChevronDown,
  Upload,
  Download,
  AlertCircle,
  Check
} from 'lucide-react';

export const LicensedClientsModule: React.FC = () => {
  const [clients, setClients] = useState<LicensedClient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [levyFilter, setLevyFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<LicensedClient | null>(null);
  
  // Form states
  const [permitNumber, setPermitNumber] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [premiseName, setPremiseName] = useState<string>('');
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState<string>('January');
  const [endYear, setEndYear] = useState<string>('');
  const [endMonth, setEndMonth] = useState<string>('');
  const [tel, setTel] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [premiseCategory, setPremiseCategory] = useState<LicensedClient['premiseCategory']>('Milk Bar');
  const [county, setCounty] = useState<string>('Kericho');
  const [coolingCapacity, setCoolingCapacity] = useState<string>('');
  const [permitStatus, setPermitStatus] = useState<'active' | 'inactive'>('active');
  const [operationalStatus, setOperationalStatus] = useState<'operating' | 'closed'>('operating');
  const [levyInfo, setLevyInfo] = useState<'QFR' | 'DNQ-R'>('QFR');
  const [expiryDate, setExpiryDate] = useState<string>('');
  
  // Branches states
  const [branches, setBranches] = useState<ClientBranch[]>([]);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  
  // Temporary states for branch sub-form
  const [branchPremiseName, setBranchPremiseName] = useState<string>('');
  const [branchPermitNumber, setBranchPermitNumber] = useState<string>('');
  const [branchCategory, setBranchCategory] = useState<string>('Milk Bar');
  const [branchLocation, setBranchLocation] = useState<string>('');
  const [branchCounty, setBranchCounty] = useState<string>('Kericho');
  const [branchExpiryDate, setBranchExpiryDate] = useState<string>('');
  const [branchOperationalStatus, setBranchOperationalStatus] = useState<'operating' | 'closed'>('operating');
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  
  const toggleBranches = (clientId: string) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };
  
  // CSV Modal & import states
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRecords, setParsedRecords] = useState<LicensedClient[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState<boolean>(false);

  const categories: LicensedClient['premiseCategory'][] = [
    'Milk Bar',
    'Dispenser',
    'Cooling Plant',
    'Mini Dairy',
    'Cottage Industry',
    'Processor'
  ];

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await DBService.getClients();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingClient(null);
    setPermitNumber(`KDB/LC/${Date.now().toString().slice(-6)}`);
    setClientName('');
    setPremiseName('');
    setStartYear(new Date().getFullYear());
    setStartMonth('January');
    setEndYear('');
    setEndMonth('');
    setTel('');
    setContactPerson('');
    setLocation('');
    setPremiseCategory('Milk Bar');
    setCounty('Kericho');
    setCoolingCapacity('');
    setPermitStatus('active');
    setOperationalStatus('operating');
    setLevyInfo('QFR');
    setExpiryDate('');
    setBranches([]);
    setIsModalOpen(true);
  };

  const openEditModal = (client: LicensedClient) => {
    setEditingClient(client);
    setPermitNumber(client.id);
    setClientName(client.clientName);
    setPremiseName(client.premiseName);
    setStartYear(client.startYear);
    setStartMonth(client.startMonth);
    setEndYear(client.endYear ? String(client.endYear) : '');
    setEndMonth(client.endMonth || '');
    setTel(client.tel);
    setContactPerson(client.contactPerson);
    setLocation(client.location);
    setPremiseCategory(client.premiseCategory);
    setCounty(client.county);
    setCoolingCapacity(client.coolingCapacity ? String(client.coolingCapacity) : '');
    setPermitStatus(client.permitStatus);
    setOperationalStatus(client.operationalStatus);
    setLevyInfo(client.levyInfo);
    setExpiryDate(client.expiryDate || '');
    setBranches(client.branches || []);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this licensed client?')) return;
    try {
      await DBService.deleteClient(id);
      await fetchClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      alert('Failed to delete client');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPermitNumber = permitNumber.trim();
    if (!trimmedPermitNumber) {
      alert('Permit Number is required');
      return;
    }
    if (!clientName.trim() || !premiseName.trim() || !location.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Permit Status is strictly dictated by the permit expiry date
    let resolvedPermitStatus: 'active' | 'inactive' = 'active';
    if (expiryDate) {
      const exp = new Date(expiryDate);
      if (!isNaN(exp.getTime())) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expWithTime = new Date(exp);
        expWithTime.setHours(23, 59, 59, 999);
        resolvedPermitStatus = expWithTime >= today ? 'active' : 'inactive';
      }
    } else {
      resolvedPermitStatus = permitStatus;
    }

    const record: LicensedClient = {
      id: trimmedPermitNumber,
      clientName,
      premiseName,
      startYear,
      startMonth,
      endYear: endYear ? parseInt(endYear) : null,
      endMonth: endMonth || null,
      tel,
      contactPerson,
      location,
      premiseCategory,
      county,
      coolingCapacity: (premiseCategory === 'Cooling Plant' || premiseCategory === 'Processor') && coolingCapacity 
        ? parseInt(coolingCapacity) 
        : undefined,
      permitStatus: resolvedPermitStatus,
      operationalStatus,
      levyInfo,
      expiryDate: expiryDate || undefined,
      branches: branches.length > 0 ? branches : undefined
    };

    let oldIdToDelete = '';
    if (editingClient && editingClient.id !== trimmedPermitNumber) {
      oldIdToDelete = editingClient.id;
    }

    try {
      if (oldIdToDelete) {
        await DBService.deleteClient(oldIdToDelete);
      }
      await DBService.saveClient(record);
      setIsModalOpen(false);
      await fetchClients();
    } catch (error) {
      console.error('Failed to save client:', error);
      alert('Failed to save client');
    }
  };

  const handleAddBranch = () => {
    if (!branchPremiseName.trim() || !branchPermitNumber.trim() || !branchLocation.trim()) {
      alert("Please fill in Branch Premise Name, Permit Number, and Physical Location.");
      return;
    }
    
    // Check for duplicates
    if (!editingBranchId && branches.some(b => b.permitNumber === branchPermitNumber.trim())) {
      alert("A branch with this permit number already exists.");
      return;
    }

    const newBranch: ClientBranch = {
      id: editingBranchId || branchPermitNumber.trim(),
      premiseName: branchPremiseName.trim(),
      permitNumber: branchPermitNumber.trim(),
      premiseCategory: branchCategory,
      location: branchLocation.trim(),
      county: branchCounty.trim(),
      expiryDate: branchExpiryDate || undefined,
      operationalStatus: branchOperationalStatus
    };

    if (editingBranchId) {
      setBranches(prev => prev.map(b => b.id === editingBranchId ? newBranch : b));
      setEditingBranchId(null);
    } else {
      setBranches(prev => [...prev, newBranch]);
    }

    // Reset branch sub-form
    setBranchPremiseName('');
    setBranchPermitNumber('');
    setBranchCategory('Milk Bar');
    setBranchLocation('');
    setBranchCounty('Kericho');
    setBranchExpiryDate('');
    setBranchOperationalStatus('operating');
  };

  const handleEditBranch = (branch: ClientBranch) => {
    setEditingBranchId(branch.id);
    setBranchPremiseName(branch.premiseName);
    setBranchPermitNumber(branch.permitNumber);
    setBranchCategory(branch.premiseCategory);
    setBranchLocation(branch.location);
    setBranchCounty(branch.county);
    setBranchExpiryDate(branch.expiryDate || '');
    setBranchOperationalStatus(branch.operationalStatus);
  };

  const handleDeleteBranch = (branchId: string) => {
    setBranches(prev => prev.filter(b => b.id !== branchId));
    if (editingBranchId === branchId) {
      setEditingBranchId(null);
      setBranchPremiseName('');
      setBranchPermitNumber('');
      setBranchCategory('Milk Bar');
      setBranchLocation('');
      setBranchCounty('Kericho');
      setBranchExpiryDate('');
      setBranchOperationalStatus('operating');
    }
  };

  const downloadSampleTemplate = () => {
    const headers = [
      'clientName',
      'premiseName',
      'premiseCategory',
      'startYear',
      'startMonth',
      'endYear',
      'endMonth',
      'tel',
      'contactPerson',
      'location',
      'county',
      'coolingCapacity',
      'permitStatus',
      'operationalStatus',
      'levyInfo'
    ];
    const rows = [
      [
        'Brookside Kericho Depot',
        'Kericho Central Hub',
        'Processor',
        '2021',
        'March',
        '',
        '',
        '0711223344',
        'Robert Kirui',
        'Industrial Area, Kericho',
        'Kericho',
        '25000',
        'active',
        'operating',
        'QFR'
      ],
      [
        'Kapsoit Milk Bar',
        'Kapsoit Junction Station',
        'Milk Bar',
        '2023',
        'July',
        '',
        '',
        '0722334455',
        'Janet Chebet',
        'Kapsoit Market, off Highway',
        'Kericho',
        '',
        'active',
        'operating',
        'DNQ-R'
      ]
    ];
    // Create CSV content
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      const formatted = row.map(val => {
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(formatted.join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kdb_licensed_clients_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsCSV = () => {
    if (filteredClients.length === 0) {
      alert("No clients in the filtered view to export.");
      return;
    }
    const headers = [
      'id',
      'clientName',
      'premiseName',
      'premiseCategory',
      'startYear',
      'startMonth',
      'endYear',
      'endMonth',
      'tel',
      'contactPerson',
      'location',
      'county',
      'coolingCapacity',
      'permitStatus',
      'operationalStatus',
      'levyInfo',
      'expiryDate'
    ];
    const rows = filteredClients.map(client => {
      const resolvedPermitStatus = (() => {
        if (!client.expiryDate) {
          return client.permitStatus || 'active';
        }
        const exp = new Date(client.expiryDate);
        if (isNaN(exp.getTime())) {
          return client.permitStatus || 'active';
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expWithTime = new Date(exp);
        expWithTime.setHours(23, 59, 59, 999);
        return expWithTime >= today ? 'active' : 'inactive';
      })();

      return [
        client.id,
        client.clientName,
        client.premiseName,
        client.premiseCategory,
        client.startYear,
        client.startMonth,
        client.endYear || '',
        client.endMonth || '',
        client.tel,
        client.contactPerson,
        client.location,
        client.county,
        client.coolingCapacity || '',
        resolvedPermitStatus,
        client.operationalStatus,
        client.levyInfo,
        client.expiryDate || ''
      ];
    });
    const csvRows = [headers.join(',')];
    rows.forEach(row => {
      const formatted = row.map(val => {
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(formatted.join(','));
    });
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `kdb_licensed_clients_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length < 2) {
        setParseErrors(["The uploaded file is empty or missing data lines."]);
        setParsedRecords([]);
        return;
      }
      
      const headers = parseCSVLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').trim());
      const records: LicensedClient[] = [];
      const errors: string[] = [];
      const csvClientNames = new Set<string>();
      
      // Helper function to find and return value by matching flexible potential headers
      const getVal = (rowData: any, possibleKeys: string[]): string => {
        const cleanPossible = possibleKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
        for (const h of Object.keys(rowData)) {
          const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanPossible.includes(cleanHeader)) {
            return rowData[h] || '';
          }
        }
        return '';
      };

      // Helper to match full month names
      const normalizePeriod = (val: string): string => {
        if (!val) return 'January';
        const monthsList = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const trimmed = val.trim().toLowerCase();
        const match = monthsList.find(m => m.toLowerCase() === trimmed || m.toLowerCase().slice(0, 3) === trimmed);
        return match || 'January';
      };

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
        if (values.length < headers.length) {
          continue;
        }
        
        const rowData: any = {};
        headers.forEach((header, index) => {
          rowData[header] = values[index];
        });
        
        const rowNum = i + 1;
        
        const cName = getVal(rowData, ['clientname', 'client', 'name', 'company', 'companyname']).trim();
        const pName = getVal(rowData, ['premisename', 'premise', 'businessname', 'locationname', 'facility']).trim();
        
        const rawCat = getVal(rowData, ['premisecategory', 'category', 'type', 'premisetype']).trim();
        const cat = categories.find(c => c.toLowerCase() === rawCat.toLowerCase()) || rawCat;

        const rawStartY = getVal(rowData, ['startyear', 'year', 'registeredyear', 'regyear']).trim();
        let startY = parseInt(rawStartY);
        if (isNaN(startY)) {
          const match = rawStartY.match(/\b(19|20)\d{2}\b/);
          if (match) {
            startY = parseInt(match[0]);
          }
        }

        const startM = normalizePeriod(getVal(rowData, ['startmonth', 'month', 'registeredmonth', 'regmonth']));
        const phone = getVal(rowData, ['tel', 'telephone', 'phone', 'phonenumber', 'contactnumber', 'contactno']).trim();
        const contact = getVal(rowData, ['contactperson', 'contact', 'manager', 'owner', 'proprietor']).trim();
        const loc = getVal(rowData, ['location', 'subcounty', 'town', 'address', 'area']).trim();
        const co = getVal(rowData, ['county', 'district', 'region']).trim() || 'Kericho';
        
        const rawPermitStatus = getVal(rowData, ['permitstatus', 'status', 'permit', 'active']).trim().toLowerCase();
        const status = rawPermitStatus === 'inactive' ? 'inactive' : 'active';
        
        const rawOpStatus = getVal(rowData, ['operationalstatus', 'operational', 'operationstatus', 'operation']).trim().toLowerCase();
        const opStatus = rawOpStatus === 'closed' ? 'closed' : 'operating';
        
        const rawLevy = getVal(rowData, ['levyinfo', 'levy', 'levytype', 'qfr']).trim().toUpperCase();
        const levy = rawLevy === 'DNQ-R' ? 'DNQ-R' : 'QFR';
        
        if (!cName) {
          errors.push(`Row ${rowNum}: Client Name is required.`);
          continue;
        }
        if (!pName) {
          errors.push(`Row ${rowNum}: Premise Name is required.`);
          continue;
        }

        const uniqueKey = `${cName.toLowerCase()}|||${pName.toLowerCase()}`;
        if (csvClientNames.has(uniqueKey)) {
          errors.push(`Row ${rowNum}: Duplicate client entry within the CSV file for "${cName}" (${pName}).`);
          continue;
        }
        csvClientNames.add(uniqueKey);

        const dbDuplicateExists = clients.some(c => 
          c.clientName.trim().toLowerCase() === cName.toLowerCase() && 
          c.premiseName.trim().toLowerCase() === pName.toLowerCase()
        );
        if (dbDuplicateExists) {
          errors.push(`Row ${rowNum}: Duplicate client entry. Client "${cName}" with premise "${pName}" already exists in the database.`);
          continue;
        }
        if (!cat || !categories.includes(cat as any)) {
          errors.push(`Row ${rowNum}: Invalid Premise Category "${rawCat}". Must be one of: ${categories.join(', ')}`);
          continue;
        }
        if (isNaN(startY) || startY < 1980 || startY > 2030) {
          errors.push(`Row ${rowNum}: Invalid Start Year "${rawStartY}". Must be a number between 1980 and 2030.`);
          continue;
        }
        
        let cap: number | undefined = undefined;
        if (cat === 'Cooling Plant' || cat === 'Processor') {
          const coolingCapVal = getVal(rowData, ['coolingcapacity', 'capacity', 'volume', 'litres']).replace(/,/g, '').trim();
          cap = coolingCapVal ? parseInt(coolingCapVal) : 0;
          if (isNaN(cap)) cap = 0;
        }

        const rawEndYear = getVal(rowData, ['endyear', 'closedyear', 'closeyear']).trim();
        let endYParsed: number | null = rawEndYear ? parseInt(rawEndYear) : null;
        if (rawEndYear && isNaN(endYParsed as any)) {
          const match = rawEndYear.match(/\b(19|20)\d{2}\b/);
          if (match) {
            endYParsed = parseInt(match[0]);
          }
        }

        const rawEndMonth = getVal(rowData, ['endmonth', 'closedmonth', 'closemonth']).trim();
        const endMParsed = rawEndMonth ? normalizePeriod(rawEndMonth) : null;

        const id = getVal(rowData, ['id', 'clientid', 'permitno']) || `KDB/LC/${Date.now().toString().slice(-4)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const rawExpiryDate = getVal(rowData, ['expirydate', 'expiry', 'permitexpiry']).trim();

        records.push({
          id,
          clientName: cName,
          premiseName: pName,
          premiseCategory: cat as any,
          startYear: startY,
          startMonth: startM,
          endYear: isNaN(endYParsed as any) ? null : endYParsed,
          endMonth: endMParsed,
          tel: phone,
          contactPerson: contact,
          location: loc,
          county: co,
          coolingCapacity: cap,
          permitStatus: status,
          operationalStatus: opStatus,
          levyInfo: levy,
          expiryDate: rawExpiryDate || undefined
        });
      }
      
      setParsedRecords(records);
      setParseErrors(errors);
    };
    reader.readAsText(file);
  };

  const handleBulkImportSubmit = async () => {
    if (parsedRecords.length === 0) {
      alert("No valid records to import.");
      return;
    }
    setImporting(true);
    try {
      await DBService.saveClientsBulk(parsedRecords);
      setIsImportModalOpen(false);
      setCsvFile(null);
      setParsedRecords([]);
      setParseErrors([]);
      await fetchClients();
      alert(`Successfully imported ${parsedRecords.length} clients!`);
    } catch (error) {
      console.error("Bulk import failed:", error);
      alert("Failed to complete bulk import. Please check connection and try again.");
    } finally {
      setImporting(false);
    }
  };

  // Filter clients based on search & filters
  const filteredClients = clients.filter(client => {
    const matchesSearch = 
      client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.premiseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'All' || client.premiseCategory === categoryFilter;
    const matchesLevy = levyFilter === 'All' || client.levyInfo === levyFilter;
    
    // Dynamic Permit Status
    const clientPermitStatus = (() => {
      if (!client.expiryDate) {
        return client.permitStatus || 'active';
      }
      const exp = new Date(client.expiryDate);
      if (isNaN(exp.getTime())) {
        return client.permitStatus || 'active';
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expWithTime = new Date(exp);
      expWithTime.setHours(23, 59, 59, 999);
      return expWithTime >= today ? 'active' : 'inactive';
    })();

    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = clientPermitStatus === 'active';
    } else if (statusFilter === 'expired') {
      matchesStatus = clientPermitStatus === 'inactive';
    } else if (statusFilter === 'operating') {
      matchesStatus = client.operationalStatus === 'operating';
    } else if (statusFilter === 'closed') {
      matchesStatus = client.operationalStatus === 'closed';
    }

    return matchesSearch && matchesCategory && matchesLevy && matchesStatus;
  });

  // Calculate high-level stats
  const totalCount = clients.length;
  const totalQFR = clients.filter(c => c.levyInfo === 'QFR').length;
  const totalDNQR = clients.filter(c => c.levyInfo === 'DNQ-R').length;

  // Category breakdown stats
  const categoryStats = categories.map(cat => {
    const catClients = clients.filter(c => c.premiseCategory === cat);
    const licensed = catClients.length;
    const qfr = catClients.filter(c => c.levyInfo === 'QFR').length;
    const dnqr = catClients.filter(c => c.levyInfo === 'DNQ-R').length;
    
    // Sum capacity for Cooling Plant and Processor
    let capacitySum = 0;
    if (cat === 'Cooling Plant' || cat === 'Processor') {
      capacitySum = catClients.reduce((sum, c) => sum + (c.coolingCapacity || 0), 0);
    }

    return {
      category: cat,
      licensed,
      qfr,
      dnqr,
      capacitySum
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[32px] p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 bottom-0 opacity-10 translate-y-6 translate-x-6 pointer-events-none">
          <Building size={320} className="text-white" />
        </div>
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-3">
            <Sparkles size={12} /> Live Licensed Registry
          </div>
          <h1 className="text-3xl font-black tracking-tight">Licensed Clients Database</h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Manage your licensed dairies, milk bars, cooling stations, and processors. Track their operational lifespan, levy qualification, and cooling infrastructure capacity.
          </p>
        </div>
      </div>

      {/* 3 Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Licensed Entities</p>
            <h3 className="text-3xl font-black text-slate-800">{totalCount}</h3>
            <p className="text-[10px] text-slate-400 font-medium">Active in KDB system</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-700">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Qualifies for Returns (QFR)</p>
            <h3 className="text-3xl font-black text-emerald-600">{totalQFR}</h3>
            <p className="text-[10px] text-emerald-600/70 font-semibold uppercase tracking-wider">Required to file</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Exempt / Non-Qualifying (DNQ-R)</p>
            <h3 className="text-3xl font-black text-amber-600">{totalDNQR}</h3>
            <p className="text-[10px] text-amber-600/70 font-semibold uppercase tracking-wider">No returns filing required</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <XCircle size={22} />
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Breakdown by Permit Category</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Statistical status matrix per class</p>
          </div>
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-150">
            {categories.length} Registered Categories
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/20 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Permit Category</th>
                <th className="px-6 py-4 text-center">Total Licensed</th>
                <th className="px-6 py-4 text-center text-emerald-600">QFR (Files Returns)</th>
                <th className="px-6 py-4 text-center text-amber-600">DNQ-R (Exempt)</th>
                <th className="px-6 py-4 text-right">Cooling Capacity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {categoryStats.map(stat => (
                <tr key={stat.category} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span>
                      {stat.category === 'Mini Dairy' || stat.category === 'Cottage Industry'
                        ? stat.category
                        : `${stat.category}s`}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-800 font-black">{stat.licensed}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-black text-[10px]">
                      {stat.qfr}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-black text-[10px]">
                      {stat.dnqr}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-medium text-slate-500">
                    {stat.category === 'Cooling Plant' || stat.category === 'Processor' ? (
                      <span className="text-slate-800 font-bold flex items-center justify-end gap-1">
                        <ThermometerSnowflake size={12} className="text-blue-500" />
                        {stat.capacitySum.toLocaleString()} Litres
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main Registry List */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6">
        
        {/* Toolbar & Filters */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-grow">
            {/* Search */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by client, premise, contact, address..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-5 py-3 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-bold text-slate-800 text-xs"
              />
            </div>
            
            {/* Category Filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="appearance-none w-full pl-5 pr-10 py-3 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-bold text-slate-800 text-xs cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Levy Filter */}
            <div className="relative">
              <select
                value={levyFilter}
                onChange={e => setLevyFilter(e.target.value)}
                className="appearance-none w-full pl-5 pr-10 py-3 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-bold text-slate-800 text-xs cursor-pointer"
              >
                <option value="All">All Levy Statuses</option>
                <option value="QFR">Qualifies (QFR)</option>
                <option value="DNQ-R">Exempt (DNQ-R)</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="appearance-none w-full pl-5 pr-10 py-3 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-950/5 outline-none transition-all font-bold text-slate-800 text-xs cursor-pointer"
              >
                <option value="All">All Permits</option>
                <option value="active">Valid Permits</option>
                <option value="expired">Expired Permits</option>
                <option value="operating">Operating Premises</option>
                <option value="closed">Closed Premises</option>
              </select>
              <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => {
                setCsvFile(null);
                setParsedRecords([]);
                setParseErrors([]);
                setIsImportModalOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm border border-slate-200"
            >
              <Upload size={14} /> Import CSV
            </button>
            <button
              onClick={downloadAllAsCSV}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-sm border border-slate-200"
            >
              <Download size={14} /> Export CSV
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest px-5 py-3 rounded-2xl transition-all shadow-md"
            >
              <Plus size={14} /> Add Client
            </button>
          </div>
        </div>

        {/* Data List or Loading */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-transparent mx-auto" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Loading client registry...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-3xl space-y-2">
            <Building className="mx-auto text-slate-300 w-12 h-12" />
            <p className="text-xs text-slate-700 font-bold uppercase tracking-wider">No licensed clients found</p>
            <p className="text-[10px] text-slate-400">Try loosening your filters or create a new licensed client profile.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Client & Premise</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Lifespan Timeline</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Status & Levy</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredClients.map(client => (
                  <React.Fragment key={client.id}>
                    <tr className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 space-y-1">
                        <div className="text-slate-900 font-black text-sm">{client.clientName}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 font-bold">
                          <Building size={10} /> {client.premiseName}
                        </div>
                        {client.branches && client.branches.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleBranches(client.id)}
                            className="text-[9px] text-blue-600 hover:text-blue-800 font-black uppercase tracking-wider flex items-center gap-1 bg-blue-50/50 hover:bg-blue-50 px-2 py-0.5 rounded transition-all mt-1"
                          >
                            <span>{expandedClients[client.id] ? 'Hide' : 'Show'} Branches ({client.branches.length})</span>
                            <ChevronDown size={10} className={`transform transition-transform ${expandedClients[client.id] ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="text-slate-800">{client.premiseCategory}</div>
                        {client.coolingCapacity && (
                          <div className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5">
                            <ThermometerSnowflake size={10} /> {client.coolingCapacity.toLocaleString()} L Capacity
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="text-slate-800 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{client.startMonth} {client.startYear}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {client.operationalStatus === 'closed' && client.endYear ? (
                            <span className="text-rose-600">Ended: {client.endMonth} {client.endYear}</span>
                          ) : (
                            <span className="text-emerald-600 uppercase tracking-widest font-black text-[9px]">Currently Operating</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="text-slate-800 flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          <span>{client.contactPerson}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                          <Phone size={10} /> {client.tel}
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-2">
                        <div className="flex gap-1.5 items-center flex-wrap">
                          {/* Permit Status Badge */}
                          {(() => {
                            const resolvedPermitStatus = (() => {
                              if (!client.expiryDate) {
                                return client.permitStatus || 'active';
                              }
                              const exp = new Date(client.expiryDate);
                              if (isNaN(exp.getTime())) {
                                return client.permitStatus || 'active';
                              }
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              const expWithTime = new Date(exp);
                              expWithTime.setHours(23, 59, 59, 999);
                              return expWithTime >= today ? 'active' : 'inactive';
                            })();

                            return (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${resolvedPermitStatus === 'active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`} title={client.expiryDate ? `Expires: ${client.expiryDate}` : undefined}>
                                Permit: {resolvedPermitStatus === 'active' ? 'Valid' : 'Expired'} {client.expiryDate ? `(${client.expiryDate})` : ''}
                              </span>
                            );
                          })()}
                          {/* Operational Status Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${client.operationalStatus === 'operating' ? 'bg-teal-50 text-teal-700 border border-teal-100' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                            Ops: {client.operationalStatus === 'operating' ? 'Operating' : 'Closed'}
                          </span>
                          {/* Levy Qualification Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${client.levyInfo === 'QFR' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                            Levy: {client.levyInfo}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 font-bold">
                          <MapPin size={10} /> {client.location}, {client.county}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(client)}
                            title="Edit Profile"
                            className="p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            title="Delete Client"
                            className="p-2 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedClients[client.id] && client.branches && client.branches.length > 0 && (
                      <tr className="bg-slate-50/40 border-b border-slate-100 animate-in slide-in-from-top-2 duration-150">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <Building size={10} /> Registered Branches (Premises)
                            </h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {client.branches.map(br => (
                                <div key={br.id} className="p-3 bg-white rounded-xl border border-slate-150 flex flex-col justify-between space-y-1 shadow-sm">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                                      <Building size={11} className="text-slate-400 animate-pulse" />
                                      <span>{br.premiseName}</span>
                                    </div>
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${br.operationalStatus === 'operating' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                                      {br.operationalStatus}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-2 text-[10px] text-slate-500 font-bold leading-relaxed pt-1 border-t border-slate-50 mt-1">
                                    <div>Permit: <span className="font-mono text-slate-700">{br.permitNumber}</span></div>
                                    <div>Category: <span className="text-slate-700">{br.premiseCategory}</span></div>
                                    <div className="col-span-2">Loc: <span className="text-slate-700">{br.location}, {br.county}</span></div>
                                    {br.expiryDate && <div className="col-span-2 text-[9px] text-slate-400">Expiry Date: <span className="font-bold text-slate-600">{br.expiryDate}</span></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800">
                  {editingClient ? 'Edit Client Profile' : 'Register Licensed Client'}
                </h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  {editingClient ? `Editing profile ID: ${editingClient.id}` : 'Create a new licensed record in the database'}
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 font-bold text-sm uppercase tracking-widest bg-white border border-slate-150 px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-6">
              
              {/* Permit Number / License ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Permit Number (License ID) *</label>
                <input
                  required
                  type="text"
                  value={permitNumber}
                  onChange={e => setPermitNumber(e.target.value)}
                  placeholder="e.g. KDB/LC/123456"
                  className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                />
              </div>

              {/* Primary client and premise info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Client Name *</label>
                  <input
                    required
                    type="text"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="e.g. Brookside Dairies"
                    className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Premise Name *</label>
                  <input
                    required
                    type="text"
                    value={premiseName}
                    onChange={e => setPremiseName(e.target.value)}
                    placeholder="e.g. Kericho Cooling Hub"
                    className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Categorization & Capacity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Premise Category *</label>
                  <div className="relative">
                    <select
                      value={premiseCategory}
                      onChange={e => setPremiseCategory(e.target.value as LicensedClient['premiseCategory'])}
                      className="appearance-none w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Show cooling capacity input ONLY for Cooling Plants and Processors */}
                {(premiseCategory === 'Cooling Plant' || premiseCategory === 'Processor') ? (
                  <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4 flex items-center gap-1">
                      <ThermometerSnowflake size={10} /> Cooling Capacity (Litres) *
                    </label>
                    <input
                      required
                      type="number"
                      value={coolingCapacity}
                      onChange={e => setCoolingCapacity(e.target.value)}
                      placeholder="e.g. 10000"
                      min="0"
                      className="w-full px-5 py-3.5 rounded-2xl border border-blue-200 bg-blue-50/10 focus:bg-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold text-slate-800 text-xs"
                    />
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-4 flex items-center justify-center text-slate-400 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Cooling capacity not applicable for {premiseCategory}</span>
                  </div>
                )}
              </div>

              {/* Start Timeline and End Timeline */}
              <div className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 space-y-4">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={13} /> OperationalLifespan Timeline
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Start Timeline */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Start of Operations</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <select
                          value={startMonth}
                          onChange={e => setStartMonth(e.target.value)}
                          className="appearance-none w-full px-3 py-2.5 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px] cursor-pointer"
                        >
                          {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <input
                        required
                        type="number"
                        value={startYear}
                        onChange={e => setStartYear(parseInt(e.target.value))}
                        placeholder="Year"
                        min="1980"
                        max="2030"
                        className="w-full px-3 py-2.5 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                  </div>

                  {/* End Timeline (Optional - set only if closed) */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">End of Operations (If applicable)</span>
                      {operationalStatus === 'operating' && (
                        <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Still Active</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <select
                          disabled={operationalStatus === 'operating'}
                          value={endMonth}
                          onChange={e => setEndMonth(e.target.value)}
                          className="appearance-none w-full px-3 py-2.5 rounded-xl border bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px] cursor-pointer"
                        >
                          <option value="">Month</option>
                          {months.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <input
                        disabled={operationalStatus === 'operating'}
                        type="number"
                        value={endYear}
                        onChange={e => setEndYear(e.target.value)}
                        placeholder="Year"
                        min="1980"
                        max="2030"
                        className="w-full px-3 py-2.5 rounded-xl border bg-white disabled:bg-slate-100 disabled:text-slate-400 focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contacts & Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Contact Person *</label>
                  <input
                    required
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. Samuel Langat"
                    className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Phone Contacts *</label>
                  <input
                    required
                    type="tel"
                    value={tel}
                    onChange={e => setTel(e.target.value)}
                    placeholder="e.g. 0712345678"
                    className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">County *</label>
                  <input
                    required
                    type="text"
                    value={county}
                    onChange={e => setCounty(e.target.value)}
                    placeholder="e.g. Kericho"
                    className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Physical Location / Address *</label>
                <input
                  required
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Kapsoit Market, off Kisumu Road"
                  className="w-full px-5 py-3.5 rounded-2xl border bg-slate-50 focus:bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-xs"
                />
              </div>

              {/* Status toggles & Levy Qualification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100">
                <div className="space-y-1.5 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-3">Permit Expiry Date *</span>
                    <input
                      required
                      type="date"
                      value={expiryDate}
                      onChange={e => {
                        const newDate = e.target.value;
                        setExpiryDate(newDate);
                        if (newDate) {
                          const exp = new Date(newDate);
                          if (!isNaN(exp.getTime())) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const expWithTime = new Date(exp);
                            expWithTime.setHours(23, 59, 59, 999);
                            setPermitStatus(expWithTime >= today ? 'active' : 'inactive');
                          }
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                    />
                  </div>
                  <div className="text-[10px] font-bold block ml-3 text-slate-500">
                    Calculated Status: {permitStatus === 'active' ? (
                      <span className="text-emerald-600 uppercase font-black tracking-widest text-[9px]">Valid</span>
                    ) : (
                      <span className="text-rose-600 uppercase font-black tracking-widest text-[9px]">Expired</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-3">Operational Status</span>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-150">
                    <button
                      type="button"
                      onClick={() => {
                        setOperationalStatus('operating');
                        setEndMonth('');
                        setEndYear('');
                      }}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${operationalStatus === 'operating' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Operating
                    </button>
                    <button
                      type="button"
                      onClick={() => setOperationalStatus('closed')}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${operationalStatus === 'closed' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Closed
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block ml-3">Levy Qualification</span>
                  <div className="flex bg-white p-1 rounded-xl border border-slate-150">
                    <button
                      type="button"
                      onClick={() => setLevyInfo('QFR')}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${levyInfo === 'QFR' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      QFR
                    </button>
                    <button
                      type="button"
                      onClick={() => setLevyInfo('DNQ-R')}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${levyInfo === 'DNQ-R' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      DNQ-R
                    </button>
                  </div>
                </div>
              </div>

              {/* Branches (Premises) Registry Sub-form */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Branches (Premises) Registry</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                    Register separate branches in different locations under this client account
                  </p>
                </div>

                {/* Existing branches list */}
                {branches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-2">
                    {branches.map(br => (
                      <div key={br.id} className="p-4 rounded-2xl border border-slate-150 bg-slate-50/50 flex items-start justify-between gap-4 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-black text-slate-800">
                            <Building size={12} className="text-slate-500" />
                            <span>{br.premiseName}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-normal">
                              {br.permitNumber}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold space-x-2">
                            <span>Category: {br.premiseCategory}</span>
                            <span>•</span>
                            <span>Loc: {br.location}, {br.county}</span>
                            {br.expiryDate && (
                              <>
                                <span>•</span>
                                <span>Expires: {br.expiryDate}</span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${br.operationalStatus === 'operating' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-150 text-slate-500'}`}>
                              {br.operationalStatus}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditBranch(br)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                          >
                            <Edit2 size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBranch(br.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                    <Building className="mx-auto text-slate-300 w-8 h-8 mb-1" />
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No branches registered for this client</p>
                  </div>
                )}

                {/* Add/Edit branch container */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-150 space-y-4">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Plus size={12} /> {editingBranchId ? 'Edit Branch' : 'Add New Branch'}
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Branch Premise Name *</label>
                      <input
                        type="text"
                        value={branchPremiseName}
                        onChange={e => setBranchPremiseName(e.target.value)}
                        placeholder="e.g. Kericho Branch"
                        className="w-full px-3.5 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Branch Permit Number *</label>
                      <input
                        type="text"
                        value={branchPermitNumber}
                        onChange={e => setBranchPermitNumber(e.target.value)}
                        placeholder="e.g. KDB/LC/999888"
                        className="w-full px-3.5 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Premise Category *</label>
                      <div className="relative">
                        <select
                          value={branchCategory}
                          onChange={e => setBranchCategory(e.target.value)}
                          className="appearance-none w-full px-3.5 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px] cursor-pointer"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Physical Location/Address *</label>
                      <input
                        type="text"
                        value={branchLocation}
                        onChange={e => setBranchLocation(e.target.value)}
                        placeholder="e.g. Kapsoit Highway"
                        className="w-full px-3.5 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">County *</label>
                      <input
                        type="text"
                        value={branchCounty}
                        onChange={e => setBranchCounty(e.target.value)}
                        placeholder="e.g. Kericho"
                        className="w-full px-3.5 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Permit Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={branchExpiryDate}
                        onChange={e => setBranchExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border bg-white focus:ring-4 focus:ring-slate-900/10 outline-none transition-all font-bold text-slate-800 text-[11px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Operational Status</label>
                      <div className="flex bg-white p-0.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setBranchOperationalStatus('operating')}
                          className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${branchOperationalStatus === 'operating' ? 'bg-emerald-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Operating
                        </button>
                        <button
                          type="button"
                          onClick={() => setBranchOperationalStatus('closed')}
                          className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${branchOperationalStatus === 'closed' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          Closed
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editingBranchId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBranchId(null);
                          setBranchPremiseName('');
                          setBranchPermitNumber('');
                          setBranchCategory('Milk Bar');
                          setBranchLocation('');
                          setBranchCounty('Kericho');
                          setBranchExpiryDate('');
                          setBranchOperationalStatus('operating');
                        }}
                        className="px-4 py-2 border rounded-xl text-slate-500 hover:bg-white text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Cancel Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddBranch}
                      className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm"
                    >
                      {editingBranchId ? 'Update Branch' : 'Add Branch'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-4 rounded-2xl border text-slate-500 hover:bg-slate-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md"
                >
                  {editingClient ? 'Save Changes' : 'Confirm Registration'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Modal Overlay */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-black text-slate-800">CSV Bulk Importer</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Seamlessly register multiple clients in a single upload step
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 font-bold text-sm uppercase tracking-widest bg-white border border-slate-150 px-3 py-1.5 rounded-xl shadow-sm transition-all"
              >
                Close
              </button>
            </div>

            {/* Modal Body / Scrollable Info */}
            <div className="flex-grow overflow-y-auto p-8 space-y-6">
              
              {/* Instructions and download template */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText size={16} className="text-slate-500" /> Instructions for Bulk Import
                </h4>
                <ul className="list-disc pl-5 text-slate-600 text-xs space-y-2 leading-relaxed">
                  <li>Download the pre-formatted CSV template below to match database structures exactly.</li>
                  <li>Fill in client details using Microsoft Excel, Google Sheets, or any other CSV editor.</li>
                  <li>Ensure the <strong>premiseCategory</strong> field matches exactly: <em>Milk Bar</em>, <em>Dispenser</em>, <em>Cooling Plant</em>, <em>Mini Dairy</em>, <em>Cottage Industry</em>, or <em>Processor</em>.</li>
                  <li>Upload the saved <strong>.csv</strong> file to instantly preview and validate the fields before saving.</li>
                </ul>

                <div className="pt-2">
                  <button
                    onClick={downloadSampleTemplate}
                    className="inline-flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-sm"
                  >
                    <Download size={14} className="text-emerald-500" /> Download CSV Template (.csv)
                  </button>
                </div>
              </div>

              {/* Upload drag-and-drop / selector */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Select Completed CSV File</label>
                <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-3xl p-8 text-center transition-all bg-slate-50/50 relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="space-y-2 pointer-events-none">
                    <Upload size={32} className="mx-auto text-slate-400" />
                    <p className="text-xs font-black text-slate-700 uppercase tracking-wider">
                      {csvFile ? csvFile.name : 'Click to select or drag & drop CSV file here'}
                    </p>
                    <p className="text-[10px] text-slate-400">Supported formats: standard comma-separated files (.csv)</p>
                  </div>
                </div>
              </div>

              {/* Validation Status / Parsed Records Preview */}
              {(parsedRecords.length > 0 || parseErrors.length > 0) && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Upload Parsing Results</h4>
                    <span className="text-[10px] bg-slate-100 border text-slate-600 font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {parsedRecords.length} Valid Records Found
                    </span>
                  </div>

                  {/* Show parser errors */}
                  {parseErrors.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 rounded-2xl text-xs space-y-1.5">
                      <p className="font-black uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle size={14} /> Warning: Validation Errors Found
                      </p>
                      <div className="max-h-24 overflow-y-auto space-y-1 font-semibold pl-4 list-decimal">
                        {parseErrors.slice(0, 10).map((err, idx) => (
                          <div key={idx}>{err}</div>
                        ))}
                        {parseErrors.length > 10 && (
                          <div className="text-slate-400 italic">And {parseErrors.length - 10} more error(s)...</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show preview table */}
                  {parsedRecords.length > 0 && (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                            <th className="px-4 py-2.5">Client & Premise</th>
                            <th className="px-4 py-2.5">Category</th>
                            <th className="px-4 py-2.5">Contact</th>
                            <th className="px-4 py-2.5">Levy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                          {parsedRecords.slice(0, 100).map((record, index) => (
                            <tr key={index} className="hover:bg-slate-50/50">
                              <td className="px-4 py-2">
                                <div className="text-slate-900 font-black">{record.clientName}</div>
                                <div className="text-[9px] text-slate-400">{record.premiseName}</div>
                              </td>
                              <td className="px-4 py-2">{record.premiseCategory}</td>
                              <td className="px-4 py-2">{record.contactPerson} ({record.tel})</td>
                              <td className="px-4 py-2">
                                <span className="bg-blue-50 text-blue-700 font-black px-1.5 py-0.5 rounded text-[9px]">
                                  {record.levyInfo}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {parsedRecords.length > 100 && (
                            <tr>
                              <td colSpan={4} className="px-4 py-3 text-center text-slate-400 italic text-[10px]">
                                Preview showing first 100 records. {parsedRecords.length - 100} more clients will be imported.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Actions */}
            <div className="px-8 py-5 border-t border-slate-100 flex justify-between items-center bg-slate-50/30 shrink-0">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {parsedRecords.length > 0 ? `${parsedRecords.length} clients ready to import` : 'No file selected'}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-3 rounded-xl border text-slate-500 hover:bg-slate-50 font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={parsedRecords.length === 0 || importing}
                  onClick={handleBulkImportSubmit}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md flex items-center gap-1.5"
                >
                  {importing ? 'Importing...' : `Save ${parsedRecords.length} Clients`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
