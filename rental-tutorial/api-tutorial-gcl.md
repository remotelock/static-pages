author: RemoteLock Developers
summary: Rental Management API Example
id: 1
categories: api, rental
environments: any
status: draft
feedback link: remotelock.com
analytics account: 0

#  Rental Management API Example

## Introduction
Duration 0:05

This tutorial is a step-by-step configuration of an application that integrates
with the RemoteLock API to manage access to rental properties or rooms. In the
next steps we will go over:

- Creating an OAuth Application in the developer portal
- Customer Authentication via OAuth
- Retrieving the list of registered locks
- Generating Access User and Guest codes
- Getting confirmation that access is granted with a Webhook Subscription
(optional)
- Working with ResortLocks (optional)

Throughout this tutorial you will see links to different parts of the 
documentation. It is more detailed and can be used for troubleshooting or if you
have a different use case from what's presented here.

### What you're going to need
- A valid account on the Connect Portal
- A registered RemoteLock
- A Tool to send and inspect HTTP requests. In the examples, we will use 'curl',
  which is available for all operating systems, but feel free to use any tool
  you're more familiar with - as long as it's TLS (HTTPS) enabled
- Optional: a separate account to represent a "customer account" - if you have
  one, you should register your lock here for testing


## Creating an OAuth Application
Duration 0:05

Go to the [developer portal](https://developer.lockstate.com/), click on
"New OAuth Application" and fill the form:
- Name: The name of your application. In the examples here we'll use
"My Rental Application"
- Redirect URI: When the user authorizes your application, they will be 
redirected to this URL with an authorization code. With this code your
application will be able to generate a token to make authenticated requests
for the resources of that user. In this example we'll use a special value for
testing and non-web applications: 'urn:ietf:wg:oauth:2.0:oob'. It causes the
endpoint to just output a JSON with the authorization code after user
authorization.

After submitting the form, you will be redirected to a page with your generated
**Client ID** and **Client Secret**. These are the credentials for your
integration, so make sure you take note and keep them in a secure place.
**For security reasons, this is the only time the client secret is visible.**

## Authenticating a User
Duration 0:15

### Generating an Authorization Code

The RemoteLock API supports two of the OAuth 2.0 grant types: **Authorization
Code** and **Client Credentials**. On this example, since you want your users to
authorize your application to manage their locks, we will use the
**Authorization Code** Grant. You can check the
[Authentication Section](https://connect.lockstate.com/api/docs#authentication-section)
of the documentation for more details on the two types of grants.

With your OAuth application created, your users can be redirected to the
authorization URL to allow your application to access their resources. The URL
must be formatted as below:

```
https://connect.devicewebmanager.com/oauth/authorize?client_id=CLIENT_ID&redirect_uri=REDIRECT_URI&response_type=code
```

Replacing `CLIENT_ID` and `REDIRECT_URI` with values from the OAuth Application
you just created. If you view your application on the developer portal, you will
see an "Authorize" button next to the redirect URI that takes you to a generated
URL using the above format. If you have created a separate account to represent
a customer, you should go to that URL using an incognito / private mode, so you
can sign in using that account and not your current one.


Once you go to this URL, you will either see a sign in page or, if you're
already logged in, a list of accounts. Unless you have access to shared
accounts, this list should only have one pre-selected option, so all you need
to do is click "Authorize". If our Redirect URI was set to a URL on an
application, that is where we would've been taken now, but since we've used
`urn:ietf:wg:oauth:2.0:oob`, what you should see is a JSON result like so:

```json
  {"code":"a1b2...d4e5","state":""}
```

The value in the `code` attribute is what we call your **authorization code**,
we'll use it to generate a token to access a user's data.

### Generating a Token

To generate a token, we must send the authorization code in a `POST` request
like the following: 

```bash
curl -X POST \
  -d code=$AUTHORIZATION_CODE \
  -d client_id=$CLIENT_ID \
  -d client_secret=$CLIENT_SECRET \
  -d redirect_uri=urn:ietf:wg:oauth:2.0:oob \
  -d grant_type=authorization_code \
  'https://connect.devicewebmanager.com/oauth/token'
```

Replacing `$AUTHORIZATION_CODE`, `$CLIENT_ID` and `$CLIENT_SECRET` with their
respective values. The response should look like the following:

```json
{
  "access_token": "acc3...063n",
  "token_type": "bearer",
  "expires_in": 7199,
  "refresh_token": "13f1...ab14",
  "created_at": 1531403248
}
```

Negative
: The access token expires after 2 hours. Once that happens, you should
use the refresh token to generate a new access token. Refer to the
Authentication Section (https://connect.lockstate.com/api/docs#authentication-section)
of the documentation for more details.

The value in the `access_token` attribute of that response is what we'll use as 
authorization in the API requests to manipulate that user's resources in the
next steps.

## Retrieving the List of Locks
Duration 0:05

The next step is to retrieve the list of locks in the account so that your user
can assign them to Rooms/Units in your application. To fetch that list, use the
following request:

```bash
curl -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  'https://api.lockstate.com/devices?type[]=lock&type[]=resort_lock'
```

Replacing `$ACCESS_TOKEN` in the authorization header with the value we
generated in the previous step. Notice how an additional header is required to
specify the API version we're using. See the
[API Versioning](https://connect.lockstate.com/api/docs#versioning-section)
section of the documentation for more details. In this request we used the
`/devices` endpoint with a filter on `type`, our documentation also has more
information on
[Filtering](https://connect.lockstate.com/api/docs#filtering-section) and
[Listing Devices](https://connect.lockstate.com/api/docs#devices-get-all-devices).
Notice that we have two types on the filter, `lock` and `resort_lock`. That's
because ResortLocks work in a different way from Wi-Fi connected locks; the next
steps are focused on the latter, but there's a section in the end for **Working
with ResortLocks**.

The response should look like this:

```json
{
   "data":[
      {
         "type":"lock",
         "attributes":{
            "name":"My Lock",
            "heartbeat_interval":1200,
            // ...
            "model_id":"1d99dded-91ce-47ed-90e4-84389e783a92",
            "location_id":"38e651b3-9944-4539-be3b-13203b61d638"
         },
         "id":"053994ef-ceed-455a-a5f7-7962261a722d",
         "links":{
            // ...
         },
         "meta":{
           // ...
         }
      },
      // ...
   ],
   "meta":{
     // ...
   }
}
```

Positive
: You can use a tool like JSON Formatter
(https://jsonformatter.curiousconcept.com/) or jq
(https://stedolan.github.io/jq/) to make the JSON responses easier to read.


In this response, each entry in the `data` array is a Lock. The most important
value we need to consider here is the `id` and `type`, as we will need them to
assign an **accessible** when granting access, so this is what your application
should keep track of. 

For more information on the JSON structure of requests and responses, refer to
the
[JSON Structure](https://connect.lockstate.com/api/docs#json-overview-section)
section of the documentation.

## Granting Door Access to an User
Duration 0:05

Granting access is done in two steps:

1. Create an Access User (we'll also create an Access Guest in the next step)
with a credential that can be used on the lock.
2. Grant that Acces User access to the lock.

### Create an Access User

To create an Access User, send the following `POST` request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "access_user",
    "attributes": {
      "name": "Example User",
      "generate_pin": true
    }
  }' \
  'https://api.lockstate.com/access_persons'
```

Replacing `$ACCESS_TOKEN` in the authorization header with the value we
generated in the authentication step. Keep in mind that POST and PUT requests
require an additional `Content-Type: application/json` header. You will get a
response that looks like this:

```json
{
  "data": {
    "type": "access_user",
    "attributes": {
      "name": "Example User",
      "pin": "2155",
      // ...
      "created_at": "2018-07-12T21:05:30Z",
      "updated_at": "2018-07-12T21:05:30Z"
    },
    "id": "1864e7e5-2475-44ab-9dfe-2912469fc1b2",
    "links": {
      // ...
    }
  }
}
```

Notice that since we used `"generate_pin": true`, a PIN was generated. You could
set your own PIN, along with other options for users, all listed in the
documentation for  
[creating an access user](https://connect.lockstate.com/api/docs#access-persons-create-an-access-user).
The most important value in this response is the `id`. We'll be using it,
together with the lock's `id` and `type` we have from the previous step to grant
this newly created user access to our lock.

### Grant Access

To grant access, send the following POST request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "attributes": {
      "accessible_id": "053994ef-ceed-455a-a5f7-7962261a722d",
      "accessible_type": "lock"
    }
  }' \
  'https://api.lockstate.com/access_persons/1864e7e5-2475-44ab-9dfe-2912469fc1b2/accesses'
```

There are a few more things to replace on this step:

- The usual '$ACCESS_TOKEN'
- 'accessible_id' and 'accessible_type' must use the values you've got for your
lock from the device listing.
- The id we just got from creating the access user is used in the URL, so make
sure you replace that with the one you've got from the previous step.

For more options and details, refer to the documentation section on
[granting access](https://connect.lockstate.com/api/docs#access-persons-grant-an-access-person-access).

The response will look like this:

```json
{
  "data": {
    "type": "access_person_access",
    "attributes": {
      // ...
      "access_person_id": "1864e7e5-2475-44ab-9dfe-2912469fc1b2",
      "access_person_type": "access_user",
      "accessible_id": "053994ef-ceed-455a-a5f7-7962261a722d"
    },
    "id": "c5d4ef02-1538-4924-990e-21e40dd0d5a6",
    "links": {
      // ...
    }
  }
}
```

Your user is all set! The next time the lock wakes up, this new code will be
synchronized and usable to lock/unlock your lock.

## Granting Door Access to a Guest
Duration 0:05

Negative
: Note: This method only work for the Wi-Fi enabled RemoteLocks. If you need to
work with the ResortLock algorithmic lock, refer to the 'Working with
ResortLocks' section.

This step is very similar to the previous one. In fact, the only difference is
that in the first part, you'll be creating an **Access Guest** instead of an
**Access User**. The main difference between those is that Guests require two
additional attributes: `starts_at` and `ends_at`, to set the time period during
which that Guest has access.

### Create an Access Guest

To create an Access Guest, send the following `POST` request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "access_guest",
    "attributes": {
      "starts_at": "2020-01-02T16:04:00",
      "ends_at": "2021-01-02T16:04:00",
      "name": "My Guest",
      "pin": "4567"
    }
  }' \
  'https://api.lockstate.com/access_persons'
```

Replacing `$ACCESS_TOKEN` in the authorization header with the value we
generated in the authentication step. Feel free to change the `starts_at` and
`ends_at` values. Notice that the time format on those  do not include a
timezone. The effective timezone is the one configured at the lock. You will get
a response that looks like this:

```json
{
  "data": {
    "type": "access_guest",
    "attributes": {
      "name": "My Guest",
      "pin": "4567",
      // ..
      "starts_at": "2020-01-02T16:04:00",
      "ends_at": "2021-01-02T16:04:00"
    },
    "id": "036aa265-d008-4c1a-942d-905e7f2ec3e2",
    "links": {
      // ...
    }
  }
}
```

The most important value in this response is the `id`. We'll be using it,
together with the lock's `id` and `type` we have from the previous step to grant
this newly created user access to our lock.

For more information see the documentation section for  
[creating an access guest](https://connect.lockstate.com/api/docs#access-persons-create-an-access-guest).

### Grant access

Now all you need to do is grant access using that Access Guest's `id`, just like
you did before with the Access User. To grant access, send the following POST
request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "attributes": {
      "accessible_id": "053994ef-ceed-455a-a5f7-7962261a722d",
      "accessible_type": "lock"
    }
  }' \
  'https://api.lockstate.com/access_persons/036aa265-d008-4c1a-942d-905e7f2ec3e2/accesses'
```

Replacing `$ACCESS_TOKEN` in the authorization header with the value we
generated in the authentication step. And the response will look like this:

```json
{
  "data": {
    "type": "access_person_access",
    "attributes": {
      // ...
      "accessible_type": "lock",
      "access_person_id": "036aa265-d008-4c1a-942d-905e7f2ec3e2",
      "access_person_type": "access_guest",
      "accessible_id": "053994ef-ceed-455a-a5f7-7962261a722d"
    },
    "id": "6786a08e-665e-4722-a68f-a6b41fa129a0",
    "links": {
      // ...
    }
  }
}
```

Your guest is all set! The next time the lock wakes up, this new code will be
synchronized and usable to lock/unlock your lock within that specified time
period.

## Webhook Notification Subscriptions (Optional)
Duration 0:10

Your application might need to be informed of events as they happen in the
user's account, like when one of the codes is synchronized with a lock, or when
access is denied. The best way to do that is by creating a webhook notification
subscription, so that as events happen, an URL in your application is sent data
about the event for your application to act upon. In this example, you will
create a webhook that will be triggered when an access is synchronized with the
lock you've selected previously.

### Create a Webhook Notification Subscriber

The first step is to create a Notification Subscriber. Send the following POST
request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "webhook_notification_subscriber",
    "attributes": {
      "active": true,
      "name": "My webhook",
      "url": "https://myrentalapplication.com/my_webhook_example",
      "content_type": "json",
      "secret": "oRWQWqQ0sn5xugpl"
    }
  }' \
  'https://api.lockstate.com/notification_subscribers'
```

Where the `url` must be a valid endpoint of your application able to handle this
request. Make sure you review the requirements, along with a few more options
for configuring webhooks in the documentation section about
[creating a webhook notification subscriber](https://connect.lockstate.com/api/docs#notification-subscribers-create-a-webhook-notification-subscriber).
The response should look like this:

```json
{
  "data": {
    "type": "webhook_notification_subscriber",
    "attributes": {
      "name": "My webhook",
      "url": "https://myrentalapplication.com/my_webhook_example",
      "content_type": "json",
      "secret": "oRWQWqQ0sn5xugpl",
      "active": true,
      "created_at": "2018-07-13T14:37:17Z",
      "updated_at": "2018-07-13T14:37:17Z"
    },
    "id": "df4e347b-b885-47da-b627-59d0b4b47807",
    "links": {
      // ...
    }
  }
}
```

### Create a Notification Subscription

With the Subscriber configured, you now can associate it with event types and a
publisher. In this case we'll create a Notification Subscription for the
`access_person_synced` event using the lock `id` and `type` as a publisher.
Send the following `POST` request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "attributes": {
      "events": [
        {
          "event_type": "access_person_synced"
        }
      ],
      "publisher_type": "lock",
      "publisher_id": "053994ef-ceed-455a-a5f7-7962261a722d",
      "subscriber_type": "webhook_notification_subscriber",
      "subscriber_id": "df4e347b-b885-47da-b627-59d0b4b47807"
    }
  }' \
  'https://api.lockstate.com/notification_subscriptions'
```

Don't forget to replace `$ACCESS_TOKEN` with your generated value. Notice that
the `publisher_id`and `publisher_type` here are the values from our lock, and
the `subscriber_id` and `subscriber_type`, values for the webhook subscriber
created in the previous step. It's worth mentioning that multiple event types
can be configured, and the publisher can be a broader scope, like a Location or
even the entire Account. For more details, see the documentation section on
[creating notification subscriptions](https://connect.lockstate.com/api/docs#notification-subscriptions-create-a-notification-subscription).
You will get a response similar to the one below:

```json
{
  "data": {
    "type": "notification_subscription",
    "attributes": {
      "events": [
        {
          "event_type": "access_person_synced"
        }
      ],
      "created_at": "2018-07-13T14:54:11Z",
      "updated_at": "2018-07-13T14:54:11Z",
      "subscriber_id": "df4e347b-b885-47da-b627-59d0b4b47807",
      "subscriber_type": "webhook_notification_subscriber",
      "publisher_id": "053994ef-ceed-455a-a5f7-7962261a722d",
      "publisher_type": "lock"
    },
    "id": "09491f96-da50-4ae1-8d29-390e5397d5ad",
    "links": {
      // ...
    }
  }
}
```

Now, whenever that event happens on that lock, a `POST` request will be sent to
the configured URL with a body similar to the one below:

```json
{
  "data": {
    "type": "access_person_synced_event",
    "attributes": {
      "source": "user",
      "status": "succeeded",
      "time_zone": "America/Denver",
      "occurred_at": "2018-07-10T18:15:32Z",
			// ...
      "publisher_id": "053994ef-ceed-455a-a5f7-7962261a722d",
      "publisher_type": "lock",
      "associated_resource_id": "1864e7e5-2475-44ab-9dfe-2912469fc1b2",
      "associated_resource_type": "access_user"
    },
    "id": "a152915c-3d12-480b-8d68-baebbfa1264c",
    "links": {
      // ...
    }
  }
}
```

## Working with ResortLocks (Optional)
Duration 0:05

The process for granting access to ResortLocks work differently from what was
described in the previous step, as they use algorithmic codes instead of
synchronizing codes over Wi-Fi. If you have a registered ResortLock, the
list of devices in the response from the `/devices` endpoint should include an
objectsimilar to this one in the `data` array:

```json
{
  "type": "resort_lock",
  "attributes": {
    "name": "My ResortLock",
    // ...
  },
  "id": "ed1b7a1b-0dc5-4081-8658-728d96ed0dde",
  "links": {
    // ...
  }
}
```

To create a guest for this ResortLock, send the following `POST` request:

```bash
curl -X POST \
  -H 'Authorization: Bearer $ACCESS_TOKEN' \
  -H 'Accept: application/vnd.lockstate+json; version=1' \
  -H 'Content-Type: application/json' \
  -d '{
    "attributes": {
      "resort_lock_id": "ed1b7a1b-0dc5-4081-8658-728d96ed0dde",
      "name": "My ResortLock Guest",
      "starts_at": "2020-01-02T13:00:00",
      "ends_at": "2021-01-02T16:00:00"
    }
  }' \
  'https://api.lockstate.com/resort_lock_guests'
```

Replacing `$ACCESS_TOKEN` in the authorization header with the value we
generated in the authentication step, and the value for `resort_lock_id` with
the id for your ResortLock. This guest will only have access between the times
in `starts_at` and `ends_at`, and those should not use minutes or seconds - any
value here will be converted to 0. Refer to the
[Resort Lock Guests](https://connect.lockstate.com/api/docs#resort-lock-guests-get-all-resort-lock-guests)
documentation section for more information.

The response will look like this:

```json
{
  "data": {
    "type": "resort_lock_guest",
    "attributes": {
      "name": "My ResortLock Guest",
      "pin": "123456789012",
      "starts_at": "2020-01-02T13:00:00",
      "ends_at": "2021-01-02T16:00:00",
      // ...
      "resort_lock_id": "ed1b7a1b-0dc5-4081-8658-728d96ed0dde"
    },
    "id": "f66610b0-a73f-4cee-9ba5-eafd73f80e4d",
    "links": {
      // ...
    }
  }
}
```

The PIN for that guest is the `pin` value in the response. In the above example,
`123456789012`.
