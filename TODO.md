# TODO

* Proper progress bar when saving
* Support more than 1000 messages (pagination)
* Store token, at least in session
* Options
  * Option to set max messages
  * Option to set start/end date
  * Option to only save images
  * Option to limit file size downloads
* Host on github
* Avoid js errors for avatars and files

* Sort order for messages (newest on top, oldest on top)
* Possible to stop / cancel download
* Open images on top of page
* Show initials and random color if missing avatar
* Remember preference settings too
* Log of what was downloaded / not downloaded
* Warn about missing support for cards (or is fallback good enough?)
* Save the people/avatar in a common location to avoid redownload

Documentation

* How to use
* Security aspects
* Not supported:
  * Reactions, group space avatars, cards


Ski room:
Y2lzY29zcGFyazovL3VzL1JPT00vYTE1YjMwODAtYTYxNy0xMWVkLWEwMGItMWRjYzg4YTNmNTRk


## API Feedback

Missing api wise to be able to make a decent working chat client:

* No api for unread messages
* No api for listing reactions (or for reacting)
* No avatar for spaces?
* Very limited people search - no substring search, no username search
* No API to search for spaces - need to download eg 1000, search them, then potentially download 1000 more
  * Extremely slow "list room" search (+10 sec)
* Very slow to search for people one by one
* No API to search for text in messages