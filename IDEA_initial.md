
Hello there, I have already an example application of a sweat application that I deploy to Cloudflare.

The truth just serve you as an example skeleton how the whole structure around the actual cold has to be and I mean really has to be exactly like that.

The business logic though I would like to describe to you like this:


I need a functionally simple but visually appealing and professionally and reliably working  web application.

The idea is to 

- I need to be able to upload via drag and drop information called knowledge-files like markdown files, PDF files, text files.
- Then I need to be able to define knowledge pools where for each pool I can select which of the knowledge files that are already uploaded should be included in this specific pool. The pools our collections of links to knowledge file files.
- Then I need to be able to have a simple chat conversation on the documents that are linked to a specific pool. Dysfunctionality should be there simple in the first version we implement.. it should simply add all the contents of the files that are linked plus the chat history push it to the LLM and at the answer to history show to the user the usual things that you need to do with a AI interface that is affected by additional context files.
- Additionally, I need an API end point that allows to specify a pool identifier a question and the history so that external clients can also ask questions introduce specific pool. This API should be also used by the UI


We specifically do not need any retrieval augmented generation. This first version should solely rely on input output two the LLM.
