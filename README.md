# Webex Message Archiver

Flow:

* User goes to web app
* User is asked about token, goes to developer.webex.com
* User pastes token and logs in
* User is shown list of recent spaces (1000?)
* User selects space and presses download
  * Can select max number of messages
  * Can select date range
  * Can select whether to download files (and max file size)
* User is asked about folder to store data in
* App fetches data and saves to folder
  * App creates subfolder with space name + id as name
  * One message.json file for all text messages
  * One file for each attachment
  * App also saves html content in folder needed to read archive offline

## Design

Two part structure:

1. Downloader / archiver
2. Reader

The reader should be online (pick json file to show archive) but also an easily downloadble bundle, so people can read the archives easily, even if the web service is no longer available in the future.

## Questions

* Possible to browse spaces online too? cheap webex client (esp for inspecting bots)
* Store download meta data, so user can archive more later in same space without re-downloading existing content?

## Considerations

* Keep the downloader short, simple and open source. Important so people that dont trust it can have a look and actually verify that is not malicious (or insecure by accident)
* Might be better to search a large group space from an archive client than the current Webex client
  * Faster (plain text searchable and everything searchable locally)
  * Better navigation when many matches
  * More filters (mention me, involved persons, has attachment, etc)
  * Better able to show file content (and search)


