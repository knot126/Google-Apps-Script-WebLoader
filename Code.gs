function getHostname(url) {
  url = url.split("/");

  if (url[0] == "http:" || url[0] == "https:") {
    return url[2];
  }
  else {
    return url[0];
  }
}

function testGetHostname() {
  Logger.log(getHostname("https://google.com/"));
  Logger.log(getHostname("http://google.com/"));
  Logger.log(getHostname("google.com/"));
}

function getFullURL(visiting, url) {
  // Find URL for the real content
  if (url.indexOf("//") > 0) {
    // we should be okay
    return url;
  }
  else if (url.indexOf("//") == 0) {
    return "https:" + url;
  }
  else if (url.startsWith("/")) {
    // relative to domain, need to do hacky shit
    return "https://" + getHostname(visiting) + url;
  }
  else {
    // just append it; it should work
    return visiting.split("/").slice(0, -1).join("/") + "/" + url;
  }
}

function testGetFullURL() {
  Logger.log(getFullURL("https://google.com/example/first.html", "image.png"));
  Logger.log(getFullURL("https://google.com/example/first.html", "/image.png"));
  Logger.log(getFullURL("https://google.com/example/first.html", "//google.com/image.png"));
  Logger.log(getFullURL("https://google.com/example/first.html", "https://google.com/image.png"));
}

function getBase64ForUrl(url) {
  try {
    let response = UrlFetchApp.fetch(url);
    return "data:" + response.getAllHeaders()["Content-Type"] + ";base64," + Utilities.base64Encode(response.getContent());
  }
  catch {
    return url;
  }
}

function testGetBase64ForUrl() {
  Logger.log(getBase64ForUrl("https://staging.cohostcdn.org/avatar/1910-9770034b-817a-46b2-a327-22479e6e8f01-profile.png?dpr=2&width=80&height=80&fit=cover&auto=webp"));
}

function fixHtml(data, visting) {
  output = "";

  for (let i = 0; i < data.length; i++) {
    if (data.startsWith("src=\"", i)) {
      i += 5;
      let last = data.indexOf("\"", i);

      let oldUrl = data.slice(i, last);
      let fullUrl = getFullURL(visting, oldUrl);
      //Logger.log(`Old url: ${oldUrl}, Full url: ${fullUrl}`);
      let newUrl = getBase64ForUrl(fullUrl);
      output += "src=\"" + newUrl + "\"";
      i = last;
    }
    else if (data.startsWith("href=\"", i)) {
      let j = i + 6;
      let last = data.indexOf("\"", j);

      let oldUrl = data.slice(j, last);

      Logger.log(`CSS Old url: ${oldUrl}`);
      if (oldUrl.indexOf(".css") == -1) { output += "h"; continue; }

      let fullUrl = getFullURL(visting, oldUrl);
      Logger.log(`Old url: ${oldUrl}, Full url: ${fullUrl}`);
      let newUrl = getBase64ForUrl(fullUrl);
      output += "href=\"" + newUrl + "\"";
      i = last;
    }
    else {
      output += data[i];
    }

    //Logger.log(output);
  }

  return output;
}

function testFixHtml() {
  Logger.log(fixHtml(`<html><body><link type="text/css" rel="stylesheet" href="/themes/beta/css/ui_theme_dark.css?u=2023080100" /><img src=\"/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png\"></body></html>`, `https://furaffinity.net/example/first.html`));
}

function doGet(e) {
  let headers = {};

  // If there are headers to send, load them
  if ("headers" in e.parameter) {
    headers = JSON.parse(atob(e.parameter["headers"]));
  }

  let params = {};

  // Check if we are POSTing and if so, set the params as needed
  if ("method" in e.parameter && e.parameter["method"] == "post") {
    params = {
      "method": "post",
      "contentType": headers["Content-Type"],
      "payload": atob(e.parameter["payload"]),
    };
  }

  // Actually set the headers in the fetch params
  if ("headers" in e.parameter) {
    params["headers"] = headers;
  }

  // Do the request!
  let response = UrlFetchApp.fetch(e.parameter["url"], params);

  if ("json" in e.parameter) {
    let output = ContentService.createTextOutput();

    output.setContent(JSON.stringify({
      code: response.getResponseCode(),
      headers: response.getAllHeaders(),
      content: response.getContentText()
    }));
    
    output.setMimeType(ContentService.MimeType.JSON);

    return output;
  }
  else {
    let output = HtmlService.createHtmlOutput( fixHtml(response.getContentText(), e.parameter["url"]) );
    return output;
  }
}
