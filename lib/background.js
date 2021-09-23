chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ subdomainSeperate: true, minimumPerGroup: 2 });
});
