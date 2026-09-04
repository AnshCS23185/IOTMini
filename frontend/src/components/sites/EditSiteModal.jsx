import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { updateSite } from '../../api/sites';
import { updateOrganization } from '../../api/admin';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export const EditSiteModal = ({ isOpen, onClose, site, organization, onSuccess }) => {
  const [siteName, setSiteName] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [orgName, setOrgName] = useState('');
  const [contactInfo, setContactInfo] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (site) {
      setSiteName(site.name || '');
      setLocation(site.location || site.address || '');
      setLatitude(site.latitude != null ? String(site.latitude) : '');
      setLongitude(site.longitude != null ? String(site.longitude) : '');
      setTimezone(site.timezone || 'UTC');
      setOrgName(organization?.name || site.orgName || '');
      setContactInfo(organization?.contact_information || '');
      setError('');
    }
  }, [site, organization]);

  if (!isOpen || !site) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!siteName.trim()) {
      setError('Site Name is required');
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setError('Latitude and Longitude must be valid numbers');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Update site
      await updateSite(site.id, {
        name: siteName.trim(),
        location: location.trim(),
        address: location.trim(),
        latitude: lat,
        longitude: lon,
        timezone: timezone.trim() || 'UTC'
      });

      // 2. If organization name or contact info changed, update organization
      if (organization && (orgName.trim() !== organization.name || contactInfo.trim() !== (organization.contact_information || ''))) {
        try {
          await updateOrganization(organization.id, {
            name: orgName.trim() || organization.name,
            contact_information: contactInfo.trim()
          });
        } catch (orgErr) {
          console.error("Failed to update organization:", orgErr);
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update site. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-in">
      <div 
        className="bg-surface-elevated rounded-lg shadow-2xl w-full max-w-[500px] flex flex-col max-h-[90vh] overflow-hidden border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-elevated shrink-0">
          <div>
            <span className="text-caption text-txt-muted uppercase tracking-wider font-semibold">Edit Configuration</span>
            <h2 className="text-[20px] font-bold text-txt leading-snug mt-0.5">Edit Site</h2>
          </div>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="text-txt-muted hover:text-txt p-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-4">
            {error && (
              <div className="p-3 bg-error/10 border border-error/20 rounded-md flex items-center gap-2 text-error text-small">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Client / Organization Name */}
            <div>
              <label className="block text-small font-medium text-txt mb-1">Client Name</label>
              <input 
                type="text"
                className="input-base w-full"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Client Organization Name"
                disabled={loading}
              />
            </div>

            {/* Site Name */}
            <div>
              <label className="block text-small font-medium text-txt mb-1">
                Site Name <span className="text-error">*</span>
              </label>
              <input 
                type="text"
                className="input-base w-full"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Nagpur Solar Site"
                required
                disabled={loading}
              />
            </div>

            {/* Location / Address */}
            <div>
              <label className="block text-small font-medium text-txt mb-1">Location / Address</label>
              <input 
                type="text"
                className="input-base w-full"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Nagpur, Maharashtra, India"
                disabled={loading}
              />
            </div>

            {/* Contact Info */}
            <div>
              <label className="block text-small font-medium text-txt mb-1">Contact Information</label>
              <input 
                type="text"
                className="input-base w-full"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g. John Doe - 9876543210"
                disabled={loading}
              />
            </div>

            {/* Coordinates Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-small font-medium text-txt mb-1">
                  Latitude <span className="text-error">*</span>
                </label>
                <input 
                  type="number"
                  step="any"
                  className="input-base w-full font-mono"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="21.1458"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-small font-medium text-txt mb-1">
                  Longitude <span className="text-error">*</span>
                </label>
                <input 
                  type="number"
                  step="any"
                  className="input-base w-full font-mono"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="79.0882"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-small font-medium text-txt mb-1">Timezone</label>
              <input 
                type="text"
                className="input-base w-full font-mono"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Asia/Kolkata or UTC"
                disabled={loading}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end items-center gap-2.5 px-6 py-4 border-t border-border bg-surface-elevated shrink-0">
            <Button variant="secondary" size="medium" onClick={onClose} disabled={loading} type="button">
              Cancel
            </Button>
            <Button variant="primary" size="medium" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
