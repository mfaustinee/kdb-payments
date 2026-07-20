-- Supabase PostgreSQL Schema for Kenya Dairy Board (KDB) Integrated System
-- This file contains all table schemas and indexes needed for the Supabase Database.

-- 1. LICENSED CLIENTS TABLE (Core registry for App A & B)
CREATE TABLE IF NOT EXISTS licensed_clients (
    id TEXT PRIMARY KEY,
    clientname TEXT NOT NULL,
    premisename TEXT NOT NULL,
    startyear INTEGER NOT NULL,
    startmonth TEXT NOT NULL,
    endyear INTEGER,
    endmonth TEXT,
    tel TEXT,
    contactperson TEXT,
    location TEXT NOT NULL,
    premisecategory TEXT NOT NULL,
    county TEXT NOT NULL,
    coolingcapacity NUMERIC,
    permitstatus TEXT DEFAULT 'active',
    operationalstatus TEXT DEFAULT 'operating',
    levyinfo TEXT,
    expirydate TEXT,
    permitnumber TEXT,
    branches JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_licensed_clients_permitnumber ON licensed_clients(permitnumber);
CREATE INDEX IF NOT EXISTS idx_licensed_clients_premisecategory ON licensed_clients(premisecategory);

-- 2. CLIENT RETURNS TABLE (Ingestion and manual returns entry)
CREATE TABLE IF NOT EXISTS client_returns (
    id TEXT PRIMARY KEY,
    clientid TEXT NOT NULL REFERENCES licensed_clients(id) ON DELETE CASCADE,
    clientname TEXT NOT NULL,
    year INTEGER NOT NULL,
    period TEXT NOT NULL,
    qty NUMERIC NOT NULL,
    invoiceamount NUMERIC NOT NULL,
    returndate TEXT NOT NULL,
    paymentamount NUMERIC NOT NULL,
    paymentdate TEXT NOT NULL,
    txnref TEXT,
    lesscf NUMERIC DEFAULT 0,
    outstandingbalance NUMERIC DEFAULT 0,
    agingdays INTEGER DEFAULT 0,
    paymentstatus TEXT DEFAULT 'Unpaid',
    comments TEXT
);

CREATE INDEX IF NOT EXISTS idx_client_returns_clientid ON client_returns(clientid);
CREATE INDEX IF NOT EXISTS idx_client_returns_year_period ON client_returns(year, period);

-- 3. DATA VALIDATIONS TABLE (App B structured validations)
CREATE TABLE IF NOT EXISTS data_validations (
    id TEXT PRIMARY KEY,
    clientid TEXT NOT NULL,
    clientname TEXT NOT NULL,
    premisename TEXT NOT NULL,
    permitno TEXT NOT NULL,
    location TEXT NOT NULL,
    category TEXT NOT NULL,
    contacts TEXT,
    expirydate TEXT,
    year INTEGER NOT NULL,
    period TEXT NOT NULL,
    quantitydeclared TEXT, -- Can store numeric quantities or "Not Filed"
    unitprice NUMERIC,
    totalsales NUMERIC,
    validatorname TEXT,
    validatedat TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    remarks TEXT
);

CREATE INDEX IF NOT EXISTS idx_data_validations_permitno ON data_validations(permitno);
CREATE INDEX IF NOT EXISTS idx_data_validations_year_period ON data_validations(year, period);

-- 4. KDB VALIDATIONS TABLE (Legacy and raw validated sheets inputs)
CREATE TABLE IF NOT EXISTS kdb_validations (
    id TEXT PRIMARY KEY,
    validation_period TEXT,
    date TEXT,
    raw_data JSONB DEFAULT '{}'::jsonb,
    permit_no TEXT,
    dbo_name TEXT,
    premise_name TEXT,
    location TEXT,
    category TEXT,
    contacts TEXT
);

CREATE INDEX IF NOT EXISTS idx_kdb_validations_permit_no ON kdb_validations(permit_no);

-- 5. AGREEMENTS TABLE (CRITICAL LEGAL FILE - DO NOT ALTER OR REMOVE)
CREATE TABLE IF NOT EXISTS agreements (
    id TEXT PRIMARY KEY,
    dboname TEXT,
    premisename TEXT,
    permitno TEXT,
    location TEXT,
    county TEXT,
    arrearsbreakdown JSONB DEFAULT '[]'::jsonb,
    totalarrears NUMERIC,
    totalarrearswords TEXT,
    arrearsperiod TEXT,
    debitnoteno TEXT,
    tel TEXT,
    installments JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'draft',
    date TEXT,
    clientemail TEXT,
    pobox TEXT,
    code TEXT,
    clientsignature TEXT, -- Base64 encoded signature drawing
    officialsignature TEXT, -- Base64 encoded official signature
    officialname TEXT,
    rejectionreason TEXT,
    resubmissionreason TEXT,
    clientname TEXT,
    clienttitle TEXT,
    submittedat TEXT,
    approvedat TEXT,
    adminbypassed BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_agreements_permitno ON agreements(permitno);
CREATE INDEX IF NOT EXISTS idx_agreements_status ON agreements(status);

-- 6. CLOSURES TABLE (CRITICAL OPERATIONAL FILE - DO NOT ALTER OR REMOVE)
CREATE TABLE IF NOT EXISTS closures (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'submitted',
    submittedat TEXT NOT NULL,
    approvedat TEXT,
    dboname TEXT,
    permitno TEXT,
    premisename TEXT,
    permittype TEXT,
    county TEXT,
    subcounty TEXT,
    location TEXT,
    tel TEXT,
    closuredate TEXT,
    closurereason TEXT,
    permitstatusintent TEXT,
    declarationagreed BOOLEAN DEFAULT FALSE,
    clientsignature TEXT, -- Base64 encoded signature
    clientname TEXT,
    clienttitle TEXT,
    officialsignature TEXT, -- Base64 encoded official signature
    officialname TEXT,
    officialtitle TEXT,
    officialcomments TEXT,
    rejectionreason TEXT
);

CREATE INDEX IF NOT EXISTS idx_closures_permitno ON closures(permitno);
CREATE INDEX IF NOT EXISTS idx_closures_status ON closures(status);

-- 7. DEBTORS TABLE
CREATE TABLE IF NOT EXISTS debtors (
    id TEXT PRIMARY KEY,
    dboname TEXT,
    premisename TEXT,
    permitno TEXT,
    location TEXT,
    county TEXT,
    arrearsbreakdown JSONB DEFAULT '[]'::jsonb,
    totalarrears NUMERIC,
    totalarrearswords TEXT,
    arrearsperiod TEXT,
    debitnoteno TEXT,
    tel TEXT,
    installments JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_debtors_permitno ON debtors(permitno);

-- 8. STAFF CONFIG TABLE
CREATE TABLE IF NOT EXISTS staff_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    officialsignature TEXT NOT NULL,
    CONSTRAINT single_row_check CHECK (id = 1)
);

-- 9. COMPLAINTS TABLE
CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'submitted',
    submittedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    datereceived TEXT,
    receivedby TEXT,
    clientname TEXT NOT NULL,
    idnumber TEXT,
    stakeholdercategory TEXT,
    otherstakeholdercategory TEXT,
    postaladdress TEXT,
    tel TEXT,
    email TEXT,
    county TEXT,
    natureofcomplaint TEXT,
    othernatureofcomplaint TEXT,
    location TEXT,
    incidentdate TEXT,
    complaintdescription TEXT,
    complaintdetails TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    otherattachment TEXT,
    numattachments INTEGER DEFAULT 0,
    desiredresolution TEXT,
    declarationagreed BOOLEAN DEFAULT FALSE,
    clientsignature TEXT, -- Base64 encoded signature drawing
    clientnamedeclaration TEXT,
    
    -- Official Use / Actions
    complaintcategorycode TEXT,
    assignedto TEXT,
    investigationfindings TEXT,
    actiontaken TEXT,
    officialstatus TEXT,
    dateclosed TEXT,
    officialsignature TEXT, -- Base64 encoded official signature
    officialname TEXT,
    officialtitle TEXT,
    officialcomments TEXT,
    rejectionreason TEXT,
    complainantname TEXT,
    complainantcategory TEXT,
    telephone TEXT,
    actiondate TEXT,
    datereplied TEXT,
    referencenumber TEXT
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_email ON complaints(email);
CREATE INDEX IF NOT EXISTS idx_complaints_submittedat ON complaints(submittedat DESC);

-- 10. INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'submitted',
    submittedat TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    clientname TEXT NOT NULL,
    contactperson TEXT,
    idpassportno TEXT,
    kdblicenseno TEXT,
    postaladdress TEXT NOT NULL,
    citytown TEXT NOT NULL,
    tel TEXT,
    mobilenumber TEXT NOT NULL,
    email TEXT NOT NULL,
    clienttype TEXT NOT NULL,
    otherclienttype TEXT,
    natureofinquiry TEXT NOT NULL,
    othernatureofinquiry TEXT,
    inquirydetails TEXT NOT NULL,
    message TEXT,
    supportingdocsstatus TEXT NOT NULL DEFAULT 'To be submitted later',
    attacheddocslist TEXT,
    preferredresponsemode TEXT NOT NULL,
    declarationagreed BOOLEAN DEFAULT FALSE,
    clientsignature TEXT, -- Base64 encoded signature drawing
    
    -- Official Use / Actions
    receivedby TEXT,
    datereceived TEXT,
    departmentassigned TEXT,
    actiontaken TEXT,
    dateclosed TEXT,
    officialsignature TEXT, -- Base64 encoded official signature
    officialname TEXT,
    officialtitle TEXT,
    officialcomments TEXT,
    rejectionreason TEXT,
    county TEXT,
    clientcategory TEXT,
    telephone TEXT,
    location TEXT,
    referredto TEXT,
    actiondate TEXT,
    responsedetails TEXT,
    datereplied TEXT,
    referencenumber TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
CREATE INDEX IF NOT EXISTS idx_inquiries_submittedat ON inquiries(submittedat DESC);
