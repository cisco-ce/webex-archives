const apiUrl = 'https://api.ciscospark.com/v1/';

// typically Y2lzY29zcGFyazovL3VzL1JPT00vM2ZlMDgwMTAtZDIxZi0xMWVkLTgyY2MtMGQ2YzgwYTYxMTA1
// => ciscospark://us/ROOM/3fe08010-d21f-11ed-82cc-0d6c80a61105
function properId(id, region = 'us') {
  return btoa('ciscospark://' + region + '/ROOM/' + id);
}

function webex(url, token, method = "GET", body = null) {
    const headers = new Headers();
    headers.append("Content-Type", "application/json; charset=utf-8");
    headers.append("Authorization", `Bearer ${token}`);
    return fetch(url, { method, headers, body });
}

function whoAmI(token) {
  return webex(apiUrl + 'people/me', token);
}

function getMessages(token, roomId, max = 1000) {
  const url = `${apiUrl}messages?roomId=${roomId}&max=${max}`;
  return webex(url, token);
}

function getRoomDetails(token, roomId) {
  const url = `${apiUrl}rooms/${roomId}`;
  return webex(url, token);
}

async function getFileInfo(token, url) {
  const headers = (await webex(url, token, 'HEAD')).headers;
  const disp = headers.get('Content-Disposition');
  const size = headers.get('Content-Length');
  const type = headers.get('Content-Type');
  const name = disp.match(/filename="(.*)"/)?.[1];
  return {
    name, size, type
  };
}

function getFile(token, url) {
  return webex(url, token);
}

function sendWebexCard(token, to, text, card) {
  const url = apiUrl + 'messages';
  const body = {
    text,
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        content: card,
      },
    ]
  };

  if (to.includes('@')) {
    body.toPersonEmail = to;
  }
  else {
    let roomId = to;
    body.roomId = roomId;
  }

  return webex(url, token, 'POST', JSON.stringify(body));
}
