import localforage from 'localforage';

class StorageServiceClass {
  constructor() {
    // Configure localforage for better offline support
    localforage.config({
      driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
      name: 'BusinessIQ',
      version: 1.0,
      storeName: 'businessiq_data'
    });
  }

  async getBusinesses() {
    try {
      const businesses = await localforage.getItem('businesses');
      return businesses || [];
    } catch (error) {
      console.error('Error loading businesses:', error);
      return [];
    }
  }

  async saveBusiness(business) {
    try {
      const businesses = await this.getBusinesses();
      const existingIndex = businesses.findIndex(b => b.id === business.id);
      
      if (existingIndex >= 0) {
        businesses[existingIndex] = business;
      } else {
        businesses.push(business);
      }
      
      await localforage.setItem('businesses', businesses);
      return business;
    } catch (error) {
      console.error('Error saving business:', error);
      throw error;
    }
  }

  async deleteBusiness(businessId) {
    try {
      const businesses = await this.getBusinesses();
      const filteredBusinesses = businesses.filter(b => b.id !== businessId);
      await localforage.setItem('businesses', filteredBusinesses);
      
      // Also delete business-specific data
      await localforage.removeItem(`business_${businessId}_data`);
    } catch (error) {
      console.error('Error deleting business:', error);
      throw error;
    }
  }

  async getBusinessData(businessId, dataType) {
    try {
      const key = `business_${businessId}_${dataType}`;
      const data = await localforage.getItem(key);
      return data || [];
    } catch (error) {
      console.error(`Error loading ${dataType} for business ${businessId}:`, error);
      return [];
    }
  }

  async saveBusinessData(businessId, dataType, data) {
    try {
      const key = `business_${businessId}_${dataType}`;
      await localforage.setItem(key, data);
      return data;
    } catch (error) {
      console.error(`Error saving ${dataType} for business ${businessId}:`, error);
      throw error;
    }
  }

  async isOnline() {
    return navigator.onLine;
  }

  async syncData(businessId) {
    // Placeholder for future online sync functionality
    console.log(`Syncing data for business ${businessId}`);
  }
}

export const StorageService = new StorageServiceClass();