import React, { useState } from 'react';
import { createOrganization, createSite, createUser } from '../../api/admin';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, CheckCircle2, ChevronRight, AlertCircle, Copy } from 'lucide-react';

export const NewClientModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form State
  const [clientData, setClientData] = useState({ name: '', contactName: '', email: '', phone: '', createPortal: true });
  const [siteData, setSiteData] = useState({ name: '', location: '', latitude: '', longitude: '', timezone: 'UTC', status: 'ACTIVE' });
  
  // Success State
  const [successResult, setSuccessResult] = useState(null);

  if (!isOpen) return null;

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => { setError(''); setStep(prev => prev - 1); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 1. Create Organization
      const org = await createOrganization({ name: clientData.name, contact_information: `${clientData.contactName} - ${clientData.phone}`, status: 'ACTIVE' });
      
      // 2. Create Site
      const site = await createSite({
        organization_id: org.id,
        name: siteData.name,
        location: siteData.location,
        latitude: parseFloat(siteData.latitude),
        longitude: parseFloat(siteData.longitude),
        timezone: siteData.timezone,
        status: siteData.status
      });

      // 3. Create User if requested
      let portalUser = null;
      if (clientData.createPortal && clientData.email) {
        try {
          portalUser = await createUser({
            name: clientData.contactName,
            email: clientData.email,
            role: 'USER',
            organization_id: org.id
          });
        } catch (err) {
          console.error("Failed to create portal user:", err);
          // If user creation fails, we still created the org/site, so we can show partial success
        }
      }

      setSuccessResult({
        org,
        site,
        user: portalUser
      });
      setStep(5); // Success step
      
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setClientData({ name: '', contactName: '', email: '', phone: '', createPortal: true });
    setSiteData({ name: '', location: '', latitude: '', longitude: '', timezone: 'UTC', status: 'ACTIVE' });
    setSuccessResult(null);
    setError('');
    onClose();
    if (successResult) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in">
      <div className="bg-surface-elevated rounded-lg shadow-2xl w-full max-w-[520px] flex flex-col max-h-[85vh] overflow-hidden border border-border">
        
        {/* Header - Visual Stepper */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-elevated shrink-0">
          <div className="flex items-center flex-1 pr-4">
            {[
              { num: 1, label: 'Client' },
              { num: 2, label: 'Site' },
              { num: 3, label: 'Access' },
              { num: 4, label: 'Review' }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div className={`flex items-center gap-1.5 ${step === s.num ? '' : 'opacity-50'}`}>
                  <div className={`flex items-center justify-center h-5 w-5 rounded-full text-caption font-bold transition-colors ${
                    step >= s.num 
                      ? 'bg-primary text-primary-text' 
                      : 'bg-surface border border-border text-txt-muted'
                  }`}>
                    {s.num}
                  </div>
                  <span className={`text-small font-medium ${step >= s.num ? 'text-txt' : 'text-txt-muted'}`}>
                    {s.label}
                  </span>
                </div>
                {i < 3 && (
                  <div className="flex-1 mx-2 h-px bg-border" />
                )}
              </React.Fragment>
            ))}
          </div>
          <button onClick={resetAndClose} className="text-txt-muted hover:text-txt transition-colors p-1 rounded hover:bg-surface-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded flex items-start gap-2 text-error text-small">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CLIENT */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <Input label="Client / Organization Name" value={clientData.name} onChange={e => setClientData({...clientData, name: e.target.value})} placeholder="e.g. ABC Solar Pvt. Ltd." />
              <Input label="Primary Contact Name" value={clientData.contactName} onChange={e => setClientData({...clientData, contactName: e.target.value})} placeholder="e.g. Rahul Sharma" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Email" type="email" value={clientData.email} onChange={e => setClientData({...clientData, email: e.target.value})} placeholder="rahul@example.com" />
                <Input label="Phone (Optional)" value={clientData.phone} onChange={e => setClientData({...clientData, phone: e.target.value})} placeholder="+91 9876543210" />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={clientData.createPortal} onChange={e => setClientData({...clientData, createPortal: e.target.checked})} className="rounded text-primary focus:ring-brand-orange h-4 w-4" />
                <span className="text-small text-txt">Create portal access for this client</span>
              </label>
            </div>
          )}

          {/* STEP 2: SOLAR SITE */}
          {step === 2 && (
            <div className="flex flex-col gap-4">
              <Input label="Site Name" value={siteData.name} onChange={e => setSiteData({...siteData, name: e.target.value})} placeholder="e.g. Nagpur Solar Plant" />
              <Input label="Location (City, Region)" value={siteData.location} onChange={e => setSiteData({...siteData, location: e.target.value})} placeholder="e.g. Nagpur, Maharashtra" />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Latitude" type="number" step="any" value={siteData.latitude} onChange={e => setSiteData({...siteData, latitude: e.target.value})} placeholder="21.1458" />
                <Input label="Longitude" type="number" step="any" value={siteData.longitude} onChange={e => setSiteData({...siteData, longitude: e.target.value})} placeholder="79.0882" />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <label className="text-small font-medium text-txt">Timezone</label>
                <select className="input-base" value={siteData.timezone} onChange={e => setSiteData({...siteData, timezone: e.target.value})}>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 3: PORTAL ACCESS */}
          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div className="bg-surface border border-border rounded p-4 flex flex-col gap-2">
                <h3 className="text-body-sm font-semibold text-txt">Client Portal Access</h3>
                <p className="text-small text-txt-muted mb-2">Configure access for the primary contact to view their solar site performance.</p>
                
                {clientData.createPortal ? (
                  <>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-caption text-txt-muted uppercase">Contact</span>
                      <span className="text-small font-medium text-txt">{clientData.contactName || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-caption text-txt-muted uppercase">Email (Username)</span>
                      <span className="text-small font-medium text-txt">{clientData.email || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-caption text-txt-muted uppercase">Role</span>
                      <span className="text-small font-medium text-txt">USER</span>
                    </div>
                    <div className="mt-2 p-3 bg-success/10 border border-success/20 rounded">
                      <p className="text-caption text-txt leading-relaxed">
                        <strong>Note:</strong> The system will automatically generate a secure 4-digit PIN and send it via email to the client upon creation.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-small text-txt italic">Portal access creation was skipped in Step 1.</p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <div className="border border-border rounded overflow-hidden">
                <div className="bg-surface px-4 py-2 border-b border-border"><h4 className="text-caption font-semibold uppercase text-txt-muted">Client Details</h4></div>
                <div className="p-4 flex flex-col gap-1 text-small">
                  <div className="flex justify-between"><span className="text-txt-muted">Organization:</span><span className="font-medium">{clientData.name}</span></div>
                  <div className="flex justify-between"><span className="text-txt-muted">Contact:</span><span className="font-medium">{clientData.contactName}</span></div>
                  <div className="flex justify-between"><span className="text-txt-muted">Email:</span><span className="font-medium">{clientData.email}</span></div>
                </div>
              </div>
              <div className="border border-border rounded overflow-hidden">
                <div className="bg-surface px-4 py-2 border-b border-border"><h4 className="text-caption font-semibold uppercase text-txt-muted">Site Details</h4></div>
                <div className="p-4 flex flex-col gap-1 text-small">
                  <div className="flex justify-between"><span className="text-txt-muted">Site Name:</span><span className="font-medium">{siteData.name}</span></div>
                  <div className="flex justify-between"><span className="text-txt-muted">Location:</span><span className="font-medium">{siteData.location}</span></div>
                  <div className="flex justify-between"><span className="text-txt-muted">Coordinates:</span><span className="font-medium">{siteData.latitude}, {siteData.longitude}</span></div>
                </div>
              </div>
              <div className="border border-border rounded overflow-hidden">
                <div className="bg-surface px-4 py-2 border-b border-border"><h4 className="text-caption font-semibold uppercase text-txt-muted">Portal Access</h4></div>
                <div className="p-4 flex flex-col gap-1 text-small">
                  {clientData.createPortal ? (
                    <div className="flex justify-between"><span className="text-txt-muted">Status:</span><span className="font-medium text-success">Will generate PIN</span></div>
                  ) : (
                    <div className="flex justify-between"><span className="text-txt-muted">Status:</span><span className="font-medium">Skipped</span></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 5 && successResult && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-success mb-4" />
              <h3 className="text-subsection font-semibold text-txt mb-2">Client Created Successfully</h3>
              <p className="text-small text-txt-muted mb-6">
                {successResult.org.name} has been onboarded and {successResult.site.name} is ready for device pairing.
              </p>

              {successResult.user ? (
                <div className="w-full bg-surface border border-border rounded p-4 text-left mb-2">
                  <h4 className="text-small font-semibold text-txt mb-2">Portal Access Created</h4>
                  <div className="p-3 bg-success/10 border border-success/20 rounded">
                    <p className="text-small text-txt font-medium text-center">
                      An automated email containing a 4-digit invitation PIN has been securely dispatched to {successResult.user.email}.
                    </p>
                  </div>
                </div>
              ) : (
                 <div className="w-full bg-surface border border-border rounded p-4 text-center">
                   <p className="text-small text-txt-muted">Portal access was not created for this client.</p>
                 </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-border bg-surface-secondary flex justify-between shrink-0">
          {step < 5 ? (
            <>
              <Button variant="ghost" onClick={step === 1 ? resetAndClose : handleBack}>
                {step === 1 ? 'Cancel' : 'Back'}
              </Button>
              {step < 4 ? (
                <Button variant="primary" onClick={handleNext} disabled={
                  (step === 1 && !clientData.name) || 
                  (step === 2 && (!siteData.name || !siteData.latitude || !siteData.longitude))
                }>
                  Continue <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Client'}
                </Button>
              )}
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button variant="primary" onClick={resetAndClose}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
