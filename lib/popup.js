chrome.storage.sync.get(['subdomainSeperate', 'minimumPerGroup'], (result) => {
  document.getElementById('subdomainSeperate').checked =
    result.subdomainSeperate;
  document.getElementById('minimumPerGroup').value = result.minimumPerGroup;
});

document.getElementById('subdomainSeperate').onchange = (event) => {
  if (typeof event.target.checked === 'boolean')
    chrome.storage.sync.set({ subdomainSeperate: event.target.checked });
};

document.getElementById('minimumPerGroup').onchange = (event) => {
  if (!isNaN(+event.target.value) && +event.target.value > 0)
    chrome.storage.sync.set({ minimumPerGroup: +event.target.value });
};

document.getElementById('group-by-domain').addEventListener('click', () => {
  chrome.windows.getLastFocused(({ id: windowId }) => {
    chrome.tabs.query({ windowId }, (tabs) => {
      chrome.storage.sync.get(
        ['subdomainSeperate', 'minimumPerGroup'],
        async (result) => {
          const COLORS = [
            'grey',
            'blue',
            'red',
            'yellow',
            'green',
            'pink',
            'purple',
            'cyan'
          ];

          Object.entries(
            await tabs
              .filter(
                (tab) =>
                  tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE &&
                  !tab.pinned
              )
              .reduce(async (acc, tab) => {
                acc = await acc;
                const url = new URL(tab.pendingUrl || tab.url);
                if (url.protocol === 'chrome:') {
                  if (url.host === 'newtab') {
                    return acc;
                  }
                  if (Object.keys(acc).includes('chrome-urls')) {
                    acc['chrome-urls'].push(tab.id);
                  } else {
                    acc['chrome-urls'] = [tab.id];
                  }
                  return acc;
                } else if (url.protocol === 'chrome-extension:') {
                  let name = (await chrome.management.get(url.host)).name;
                  if (Object.keys(acc).includes(name)) {
                    acc[name].push(tab.id);
                  } else {
                    acc[name] = [tab.id];
                  }
                  return acc;
                }
                if (!result.subdomainSeperate && url.host !== 'localhost') {
                  url.host = url.host.replace(/^.*?\.(?=.*?\..*?$)/, '');
                }
                if (Object.keys(acc).includes(url.host)) {
                  acc[url.host].push(tab.id);
                } else {
                  acc[url.host] = [tab.id];
                }
                return acc;
              }, [])
          ).forEach(([groupName, tabIds], index) => {
            console.log(groupName, tabIds, index);
            chrome.tabGroups.query(
              { windowId, title: groupName },
              (matchingTabGroups) => {
                let groupId;
                if (matchingTabGroups.length === 1) {
                  if (
                    tabs.filter(
                      (tab) => tab.groupId === matchingTabGroups[0].id
                    ).length +
                      tabIds.length >=
                    result.minimumPerGroup
                  ) {
                    groupId = matchingTabGroups[0].id;
                  }
                } else if (tabIds.length < result.minimumPerGroup) {
                  return;
                }
                chrome.tabs.group(
                  {
                    ...(groupId
                      ? { groupId }
                      : {
                          createProperties: {
                            windowId
                          }
                        }),
                    tabIds
                  },
                  (id, error) => {
                    chrome.tabGroups.update(id, {
                      collapsed: true,
                      title: groupName,
                      color: COLORS[index % COLORS.length]
                    });
                  }
                );
              }
            );
          });
        }
      );
    });
  });
});
