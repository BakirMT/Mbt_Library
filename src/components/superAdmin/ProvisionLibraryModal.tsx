import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  User,
  CreditCard,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Share2,
  Check,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Lock,
} from 'lucide-react';
import {
  InstitutionType,
  DeliveryMethod,
  BillingCycle,
  Tenant,
  User as UserType,
  Subscription,
  Invitation,
} from '../../types/saas';
import { saasStorage } from '../../services/storage';
import { useRouter } from '../../router/RouterContext';

interface ProvisionLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tenant: Tenant) => void;
}

interface ProvisionLibraryModalContentProps {
  onClose: () => void;
  onSuccess: (tenant: Tenant) => void;
}

const ProvisionLibraryModalContent: React.FC<ProvisionLibraryModalContentProps> = ({
  onClose,
  onSuccess,
}) => {
  const { navigate } = useRouter();
  const plans = saasStorage.getPlans();

  // Wizard Step: 1 = Details, 2 = Admin, 3 = Subscription, 4 = Review, 5 = Confirmation
  const [step, setStep] = useState<number>(1);

  // Form State: Step 1 Details
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [institutionName, setInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState<InstitutionType>('islamic_institution');
  const [address, setAddress] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [timezone, setTimezone] = useState('Asia/Dubai');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [primaryColor, setPrimaryColor] = useState('#2563eb');

  // Form State: Step 2 Admin
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminStaffId, setAdminStaffId] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('manual_link');

  // Form State: Step 3 Subscription
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[1]?.id || plans[0]?.id || '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('annual');
  const [isTrial, setIsTrial] = useState<boolean>(false);
  const [trialDays, setTrialDays] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(14);
  const [customLimitsEnabled, setCustomLimitsEnabled] = useState(false);
  const [customMaxTitles, setCustomMaxTitles] = useState<number>(1000);
  const [customMaxCopies, setCustomMaxCopies] = useState<number>(1200);
  const [customMaxLibrarians, setCustomMaxLibrarians] = useState<number>(2);
  const [customMaxStudents, setCustomMaxStudents] = useState<number>(100);
  const [customMaxStorageMb, setCustomMaxStorageMb] = useState<number>(200);
  const [customOverrideReason, setCustomOverrideReason] = useState<string>('');

  // Errors & Status
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Created Result Data
  const [provisionResult, setProvisionResult] = useState<{
    tenant: Tenant;
    adminUser: UserType;
    subscription: Subscription;
    invitation: Invitation;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Auto-slugify library name when name changes
  useEffect(() => {
    if (!slugManuallyEdited && name.trim()) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }, [name, slugManuallyEdited]);

  // Sync custom limits with selected plan defaults or require custom limits for Premium
  useEffect(() => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan) return;

    if (selectedPlan.code === 'premium') {
      // Premium requires Super Admin to explicitly configure the limits
      setCustomLimitsEnabled(true);
      if (customMaxTitles === 0 || !customLimitsEnabled) {
        setCustomMaxTitles(5000);
        setCustomMaxCopies(7500);
        setCustomMaxLibrarians(5);
        setCustomMaxStudents(500);
        setCustomMaxStorageMb(2000);
      }
    } else if (!customLimitsEnabled) {
      setCustomMaxTitles(selectedPlan.maxTitles);
      setCustomMaxCopies(selectedPlan.maxCopies);
      setCustomMaxLibrarians(selectedPlan.maxLibrarians);
      setCustomMaxStudents(selectedPlan.maxStudents);
      setCustomMaxStorageMb(selectedPlan.storageMb);
    }
  }, [selectedPlanId, plans, customLimitsEnabled]);

  // Validation functions
  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Library name is required.';
    if (!slug.trim()) {
      errs.slug = 'Library URL slug is required.';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      errs.slug = 'Slug may only contain lowercase letters, numbers, and hyphens.';
    } else if (!saasStorage.isSlugAvailable(slug)) {
      errs.slug = `The slug "/l/${slug}" is already taken by another library.`;
    }

    if (!institutionName.trim()) {
      errs.institutionName = 'Institution name is required.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!adminFullName.trim()) errs.adminFullName = 'Admin full name is required.';
    if (!adminEmail.trim()) {
      errs.adminEmail = 'Admin email address is required.';
    } else if (!adminEmail.includes('@') || !adminEmail.includes('.')) {
      errs.adminEmail = 'Enter a valid email address.';
    }
    if (!adminPhone.trim()) errs.adminPhone = 'Admin phone number is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = (): boolean => {
    const errs: Record<string, string> = {};
    if (!selectedPlanId) errs.selectedPlanId = 'Please select a subscription plan.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setStep(4);
    }
  };

  const handleBack = () => {
    if (step > 1 && step < 5) {
      setStep(step - 1);
    }
  };

  // Safe provisioning execution via real backend API and database transaction
  const handleExecuteProvisioning = async () => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        name,
        slug,
        institutionName,
        institutionType,
        address,
        contactEmail: contactEmail || adminEmail,
        contactPhone: contactPhone || adminPhone,
        timezone,
        dateFormat,
        primaryColor,

        adminFullName,
        adminEmail,
        adminPhone,
        adminStaffId,
        invitationDeliveryMethod: deliveryMethod,

        planId: selectedPlanId,
        billingCycle,
        isTrial,
        trialDays,
        startDate,
        gracePeriodDays,
        customLimitsEnabled,
        customMaxTitles: customLimitsEnabled ? Number(customMaxTitles) : undefined,
        customMaxCopies: customLimitsEnabled ? Number(customMaxCopies) : undefined,
        customMaxLibrarians: customLimitsEnabled ? Number(customMaxLibrarians) : undefined,
        customMaxStudents: customLimitsEnabled ? Number(customMaxStudents) : undefined,
        customMaxStorageMb: customLimitsEnabled ? Number(customMaxStorageMb) : undefined,
        customOverrideReason: customLimitsEnabled ? customOverrideReason.trim() || 'Custom capacity set during library provisioning' : undefined,
      };

      // 1. Persist to real Cloud SQL PostgreSQL backend
      let serverResponse: any = null;
      try {
        const res = await fetch('/api/tenants/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Server provisioning failed.');
        }
        serverResponse = data;
      } catch (backendErr: any) {
        console.warn('Backend API provisioning error, verifying local fallback:', backendErr);
        // If server returns error, do NOT pretend success
        throw new Error(backendErr.message || 'Database write failed. Provisioning was aborted.');
      }

      // 2. Also register in local client storage for immediate synchronized UI access
      const localResult = saasStorage.provisionLibrary(payload);

      if (localResult.success && localResult.tenant && localResult.adminUser && localResult.subscription && localResult.invitation) {
        // Sync token if backend returned specific token
        if (serverResponse?.invitationToken) {
          localResult.invitation.token = serverResponse.invitationToken;
        }

        setProvisionResult({
          tenant: localResult.tenant,
          adminUser: localResult.adminUser,
          subscription: localResult.subscription,
          invitation: localResult.invitation,
        });
        setStep(5); // Confirmation screen
        onSuccess(localResult.tenant);
      } else {
        throw new Error(localResult.error || 'Failed to complete tenant records setup.');
      }
    } catch (err: any) {
      setErrors({ submit: err.message || 'Provisioning transaction failed. No records were written.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId);

  // Generated Link paths for confirmation screen
  const origin = window.location.origin;
  const libraryLandingUrl = `${origin}/l/${provisionResult?.tenant.slug || slug}`;
  const adminLoginUrl = `${origin}/l/${provisionResult?.tenant.slug || slug}/admin/login`;
  const librarianLoginUrl = `${origin}/l/${provisionResult?.tenant.slug || slug}/librarian/login`;
  const studentLoginUrl = `${origin}/l/${provisionResult?.tenant.slug || slug}/student/login`;
  const adminInvitationUrl = provisionResult ? `${origin}/invite/${provisionResult.invitation.token}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {step === 5 ? 'Library Provisioned Successfully!' : 'Add New Library Tenant'}
              </h2>
              <p className="text-xs text-slate-400">
                {step === 5
                  ? 'All isolated access URLs and single-use admin invitation tokens are active.'
                  : '4-Step Tenant Provisioning: Details, Admin, Subscription & Atomic Setup'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Tracker (Steps 1 to 4) */}
        {step < 5 && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
            <div className="flex items-center justify-between max-w-lg mx-auto text-xs">
              {[
                { s: 1, label: 'Details', icon: Building2 },
                { s: 2, label: 'Admin', icon: User },
                { s: 3, label: 'Subscription', icon: CreditCard },
                { s: 4, label: 'Review', icon: CheckCircle2 },
              ].map((item, idx) => {
                const Icon = item.icon;
                const isPassed = step > item.s;
                const isCurrent = step === item.s;
                return (
                  <React.Fragment key={item.s}>
                    <div className="flex items-center space-x-1.5">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] transition-colors ${
                          isPassed
                            ? 'bg-emerald-600 text-white'
                            : isCurrent
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isPassed ? <Check className="w-3.5 h-3.5" /> : item.s}
                      </div>
                      <span
                        className={`font-semibold ${
                          isCurrent
                            ? 'text-blue-700'
                            : isPassed
                            ? 'text-slate-700'
                            : 'text-slate-400'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                    {idx < 3 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 ${
                          step > idx + 1 ? 'bg-emerald-600' : 'bg-slate-200'
                        }`}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {errors.submit && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.submit}</span>
            </div>
          )}

          {/* ================= STEP 1: LIBRARY DETAILS ================= */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Library Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Al-Noor Islamic Seminary Library"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {errors.name && <p className="text-[11px] text-rose-600 mt-1">{errors.name}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unique Library Slug *
                  </label>
                  <div className="flex items-center">
                    <span className="px-3 py-2 text-xs text-slate-500 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg font-mono">
                      /l/
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value.toLowerCase());
                        setSlugManuallyEdited(true);
                      }}
                      placeholder="al-noor"
                      className="w-full px-3.5 py-2 text-xs rounded-r-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                  {errors.slug ? (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.slug}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      URL identifier for student, librarian, and admin landing pages.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parent Institution Name *
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. Al-Noor Educational Foundation"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {errors.institutionName && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.institutionName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Institution Type *
                  </label>
                  <select
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="islamic_institution">Islamic Institution / Madrasa / Seminary</option>
                    <option value="school">Primary / Secondary School</option>
                    <option value="college">College / High School</option>
                    <option value="university">University / Higher Academic</option>
                    <option value="public_library">Public / Municipal Library</option>
                    <option value="research_center">Research Center / Archive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Campus Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Building 12, Academic Park, Dubai"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="library@institution.edu"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+971 4 123 4567"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Time Zone
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  >
                    <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                    <option value="Asia/Riyadh">Asia/Riyadh (UTC+3)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Chicago">America/Chicago (CST)</option>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST UTC+5:30)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Format & Branding Accent
                  </label>
                  <div className="flex space-x-2">
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-2/3 px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      title="Library Accent Theme Color"
                      className="w-1/3 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: LIBRARY ADMIN ================= */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-start space-x-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Initial Administrator Account (Level 2)</span>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    This user will receive full administrative authority for this library tenant to
                    manage librarians, register students, and configure borrowing rules.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="e.g. Dr. Zayd Al-Harithi"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {errors.adminFullName && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.adminFullName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Email Address *
                  </label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@institution.edu"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {errors.adminEmail && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.adminEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Admin Phone Number *
                  </label>
                  <input
                    type="text"
                    value={adminPhone}
                    onChange={(e) => setAdminPhone(e.target.value)}
                    placeholder="+971 50 987 6543"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  {errors.adminPhone && (
                    <p className="text-[11px] text-rose-600 mt-1">{errors.adminPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Staff / Faculty ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={adminStaffId}
                    onChange={(e) => setAdminStaffId(e.target.value)}
                    placeholder="e.g. FAC-2026-09"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Invitation Delivery Method *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        id: 'manual_link',
                        label: 'Manual Secure Link',
                        desc: 'Generate single-use token on screen for Super Admin to share directly.',
                      },
                      {
                        id: 'email',
                        label: 'Email Invitation',
                        desc: 'Automated email dispatched with expiring verification link.',
                      },
                      {
                        id: 'direct_provision',
                        label: 'Direct Provisioning',
                        desc: 'Activate account immediately (Admin sets password at first login).',
                      },
                    ].map((m) => (
                      <div
                        key={m.id}
                        onClick={() => setDeliveryMethod(m.id as DeliveryMethod)}
                        className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          deliveryMethod === m.id
                            ? 'bg-blue-50/80 border-blue-600 text-blue-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{m.label}</span>
                          {deliveryMethod === m.id && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          {m.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: SUBSCRIPTION & LIMITS ================= */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Subscription Plan *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plans.map((p) => {
                    const isSelected = selectedPlanId === p.id;
                    const isPremium = p.code === 'premium';
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedPlanId(p.id);
                          if (isPremium) {
                            setCustomLimitsEnabled(true);
                          }
                        }}
                        className={`p-4 rounded-xl border cursor-pointer transition-all relative ${
                          isSelected
                            ? 'bg-blue-50/80 border-blue-600 shadow-xs ring-1 ring-blue-600/30'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {p.isPopular && (
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white">
                            POPULAR
                          </span>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                          {isPremium && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-700">
                              CUSTOM
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {p.description}
                        </p>
                        <div className="mt-2 text-xs font-black text-slate-900">
                          {isPremium ? (
                            <span className="text-purple-700 font-bold">Contact Authority (Customized)</span>
                          ) : p.priceMonthly === 0 ? (
                            <span className="text-emerald-700 font-bold">Free (₹0/month)</span>
                          ) : (
                            <span>
                              ₹{p.priceMonthly}
                              <span className="text-[10px] text-slate-500 font-normal">/mo</span> · ₹
                              {p.priceAnnual}
                              <span className="text-[10px] text-slate-500 font-normal">/yr</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-2 gap-1 text-[10px] text-slate-600">
                          <div>Titles: {isPremium ? 'Authority Configured' : p.maxTitles.toLocaleString()}</div>
                          <div>Copies: {isPremium ? 'Authority Configured' : p.maxCopies.toLocaleString()}</div>
                          <div>Librarians: {isPremium ? 'Authority Configured' : p.maxLibrarians}</div>
                          <div>Students: {isPremium ? 'Authority Configured' : p.maxStudents.toLocaleString()}</div>
                          <div className="col-span-2">Storage: {isPremium ? 'Authority Configured' : p.storageMb >= 1024 ? `${(p.storageMb / 1024).toFixed(0)} GB` : `${p.storageMb} MB`}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Billing Cycle & Terms Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 outline-none bg-white"
                  >
                    <option value="annual">Annual</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    min={0}
                    max={60}
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Authority-Controlled Custom Limits Section */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Customise Limits (Authority Controlled)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {selectedPlan?.code === 'premium'
                        ? 'Premium requires authority-configured resource quotas.'
                        : 'Optionally override any individual limit for this particular library.'}
                    </span>
                  </div>
                  {selectedPlan?.code !== 'premium' && (
                    <label className="flex items-center space-x-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={customLimitsEnabled}
                        onChange={(e) => setCustomLimitsEnabled(e.target.checked)}
                        className="rounded text-blue-600 focus:ring-0"
                      />
                      <span className="font-semibold">Enable Custom Overrides</span>
                    </label>
                  )}
                </div>

                {(customLimitsEnabled || selectedPlan?.code === 'premium') && (
                  <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 mt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Max Titles
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={customMaxTitles}
                          onChange={(e) => setCustomMaxTitles(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Max Copies
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={customMaxCopies}
                          onChange={(e) => setCustomMaxCopies(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Max Librarians
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={customMaxLibrarians}
                          onChange={(e) => setCustomMaxLibrarians(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Max Students
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={customMaxStudents}
                          onChange={(e) => setCustomMaxStudents(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Storage (MB)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={customMaxStorageMb}
                          onChange={(e) => setCustomMaxStorageMb(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs font-bold rounded border border-slate-300 bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Internal Reason for Custom Override (Audit Trail)
                      </label>
                      <input
                        type="text"
                        value={customOverrideReason}
                        onChange={(e) => setCustomOverrideReason(e.target.value)}
                        placeholder="e.g. Authorized institution capacity expansion per bilateral agreement"
                        className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= STEP 4: REVIEW & PROVISION ================= */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{name}</h3>
                    <p className="text-xs text-blue-600 font-mono">/l/{slug}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                    {institutionType.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Institution</span>
                    <span className="font-semibold text-slate-800">{institutionName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Initial Admin</span>
                    <span className="font-semibold text-slate-800">
                      {adminFullName} ({adminEmail})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Plan & Billing</span>
                    <span className="font-semibold text-slate-800">
                      {selectedPlan?.name} · {billingCycle.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Limits Source</span>
                    <span className="font-semibold text-slate-800">
                      {customLimitsEnabled ? 'Custom Authority Overrides' : 'Plan Standard Defaults'}
                    </span>
                  </div>
                </div>

                {/* Final Effective Limits Grid */}
                <div className="pt-3 border-t border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Final Effective Resource Limits to be Saved:
                  </span>
                  <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-500">Titles</div>
                      <div className="font-bold text-slate-900 text-xs">
                        {(customLimitsEnabled ? customMaxTitles : selectedPlan?.maxTitles || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-500">Copies</div>
                      <div className="font-bold text-slate-900 text-xs">
                        {(customLimitsEnabled ? customMaxCopies : selectedPlan?.maxCopies || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-500">Librarians</div>
                      <div className="font-bold text-slate-900 text-xs">
                        {customLimitsEnabled ? customMaxLibrarians : selectedPlan?.maxLibrarians || 0}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-500">Students</div>
                      <div className="font-bold text-slate-900 text-xs">
                        {(customLimitsEnabled ? customMaxStudents : selectedPlan?.maxStudents || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-500">Storage</div>
                      <div className="font-bold text-slate-900 text-xs">
                        {customLimitsEnabled
                          ? `${customMaxStorageMb} MB`
                          : (selectedPlan?.storageMb || 0) >= 1024
                          ? `${((selectedPlan?.storageMb || 0) / 1024).toFixed(0)} GB`
                          : `${selectedPlan?.storageMb || 0} MB`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Atomic Safety Notice */}
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Atomic Transaction Guarantee</span>
                  <p className="text-emerald-700 text-[11px] mt-0.5">
                    Upon clicking &quot;Provision Library&quot;, the system commits the tenant record,
                    assigns default limits, custom overrides, and effective limits, creates the administrator credentials,
                    and generates unforgeable single-use access links.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 5: CONFIRMATION & ACCESS LINKS ================= */}
          {step === 5 && provisionResult && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {provisionResult.tenant.name} is Ready!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Tenant ID: <code className="font-mono">{provisionResult.tenant.id}</code> · Slug:{' '}
                  <code className="font-mono">/l/{provisionResult.tenant.slug}</code>
                </p>
              </div>

              {/* Generated Links Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Automatically Generated Access URLs
                  </span>
                  <button
                    onClick={() => {
                      const allText = `MBT Library Tenant Provisioned: ${provisionResult.tenant.name}
Landing Page: ${libraryLandingUrl}
Admin Login: ${adminLoginUrl}
Librarian Login: ${librarianLoginUrl}
Student Login: ${studentLoginUrl}
Admin Invitation Link: ${adminInvitationUrl}`;
                      handleCopy(allText, 'all');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedLink === 'all' ? 'Copied All!' : 'Copy All Links'}</span>
                  </button>
                </div>

                {/* 1. Admin Single-Use Invitation Link */}
                <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-blue-900 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-blue-700" />
                      <span>Single-Use Admin Invitation Link (Level 2)</span>
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      Expires in 7 days
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1.5">
                    <input
                      type="text"
                      readOnly
                      value={adminInvitationUrl}
                      className="w-full text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-blue-300 text-slate-700 select-all"
                    />
                    <button
                      onClick={() => handleCopy(adminInvitationUrl, 'admin_invite')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedLink === 'admin_invite' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-blue-800 mt-1">
                    Recipient: <strong>{provisionResult.adminUser.email}</strong>. Setting their
                    password via this link completes initialization.
                  </p>
                </div>

                {/* 2. Library Tenant Portals */}
                <div className="space-y-2 text-xs">
                  {[
                    {
                      label: 'Library Public Landing Page',
                      url: libraryLandingUrl,
                      sub: 'Institution discovery and catalogue OPAC',
                    },
                    {
                      label: 'Library Admin Portal Login',
                      url: adminLoginUrl,
                      sub: 'Branch settings, staff management, and analytics',
                    },
                    {
                      label: 'Librarian Circulation Desk Login',
                      url: librarianLoginUrl,
                      sub: 'Barcode scan, issue, return, inventory',
                    },
                    {
                      label: 'Student / Member Portal Login',
                      url: studentLoginUrl,
                      sub: 'Book search, reservations, active loans',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-slate-900">{item.label}</div>
                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {item.url}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => handleCopy(item.url, `item_${idx}`)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200 cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedLink === `item_${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 cursor-pointer"
                          title="Open URL"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          {step < 5 ? (
            <>
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 1 || isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-30 flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                >
                  Cancel
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteProvisioning}
                    disabled={isSubmitting}
                    className="px-6 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm flex items-center space-x-2 cursor-pointer disabled:opacity-75"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Provisioning Library...' : 'Provision Library'}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-between">
              <button
                onClick={() => {
                  onClose();
                  if (provisionResult) {
                    navigate(`/l/${provisionResult.tenant.slug}`);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg bg-blue-50/50 flex items-center space-x-1 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Library Landing Page</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ProvisionLibraryModal: React.FC<ProvisionLibraryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <ProvisionLibraryModalContent
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

