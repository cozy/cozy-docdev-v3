{% raw %}

# Développer une application pour Cozy V3

## Présentation de la plateforme

Cozy est un serveur personnel hébergeant des applications Web permettant de manipuler des données personnelles. Les applications pour Cozy sont entièrement écrites en technologies Web (HTML, CSS et JavaScript). Elles s’exécutent dans le navigateur de l’internaute et communiquent avec le serveur via une API. Celle-ci permet d’interagir avec la base de données du serveur et d’effectuer des actions telles que l’envoi de message. Sur le serveur tournent également des applications spécifiques, les connecteurs, capables d’importer des données depuis des sources externes.

Ce guide va vous expliquer comment créer votre première application pour Cozy, en installant un environnement de développant et les quelques fichiers nécessaires à votre application.

## Installer l'environnement

### Pré-requis

Dans Cozy V3, toutes les applications sont des applications HTML5 exécutées dans le navigateur et communiquant avec l'API du serveur. Pour développer une application, vous aurez donc besoin de disposer d'un serveur exposant l'API Cozy.

La méthode la plus simple et la plus rapide pour disposer d'un tel serveur est d'utiliser l'image Docker que nous mettons à disposition. Vous aurez pour cela besoin d'avoir [installé Docker](https://docs.docker.com/engine/installation/).

Pour récupérer l'image :
```sh
docker pull cozy/cozy-app-dev
```

(La même commande vous permettra de récupérer les mises à jour de l’image. Nous publions régulièrement de nouvelles versions, pensez à mettre à jour votre serveur).

Ce serveur de développement utilise les noms de domaine `cozy.local` et `app.cozy.local`. Vous devez donc les faire pointer vers votre machine, par exemple en plaçant cette ligne dans le fichier `/etc/hosts` :
```
127.0.0.1  localhost cozy.local app.cozy.local
```

⚠️ Si vous voulez utiliser plusieurs applications, vous devrez déclarer chacun de leur sous-domaine. Par exemple, pour utiliser `Files` et `Photos`, utilisez :
```
127.0.0.1  localhost cozy.local files.cozy.local photos.cozy.local
```

La branche `sample` du dépôt de cette documentation contient un squelette minimaliste avec les fichiers nécessaires pour créer une application. Vous pouvez les récupérer en faisant :
```sh
git clone -b sample https://github.com/cozy/cozy-docdev-v3.git myapp
cd myapp
```

### Démarrer le serveur de développement


Pour lancer le serveur et lui demander de servir votre applications, placez-vous dans le dossier contenant votre application et tapez :
```sh
docker run --rm -it -p 8080:8080 -p 5984:5984 -p 8025:8025 -v $(pwd):/data/cozy-app cozy/cozy-app-dev
```

(attention : le dossier doit contenir au moins les fichiers `manifest.webapp` et `index.html`).

Quelques explications :
 - `--rm -it` : `rm` permet de supprimer l'instance lorsque vous la couperez, `it` d'avoir sa sortie affichée dans la fenêtre ;
 - `-p 8080:8080` : le serveur Cozy écoute sur le port 8080 de la machine virtuelle, on redirige ce port vers le port 8080 de votre machine. Pour utiliser un autre port de votre machine, utilisez par exemple `-p 9090:8080` ;
 - `-p 5984:5984` : expose le CouchDB du serveur sur le port 5984 de votre machine. Vous pourrez ainsi accéder à une interface de gestion de la base de données sur `http://cozy.local:5984/_utils/` ;
 - `-p 8025:8025` : expose sur le port local 8025 une interface permettant de visualiser les messages envoyés par le serveur ;
 - `-v $(pwd):/data/cozy-app` : cela permet de monter le dossier dans lequel vous êtes sur le dossier `/data/cozy-app` du serveur, où Cozy s'attend à trouver le code de votre application.

Vous pouvez alors vous connecter à l'URL `http://app.cozy.local:8080/#` pour commencer à tester votre application (après vous être identifié⋅e — le mot de passe par défaut est `cozy`).

En procédant ainsi, il n'y a aucune persistance de données : chaque fois que vous relancez une machine virtuelle, elle utilisera une base de données vierge. Pour stocker la base de données et le système de fichiers du serveur sur votre machine locale, vous devez monter respectivement les dossiers `/usr/local/couchdb/data` et `/data/cozy-storage` du serveur sur des dossiers locaux : `-v ~/cozy/data/db:/usr/local/couchdb/data -v ~/cozy/data/storage":/data/cozy-storage`.

Enfin, pour accéder plus facilement à la machine virtuelle, je vous conseille de lui donner un nom : `--name=cozydev`. Vous pourrez ainsi lancer un shell dans l'instance avec `docker exec -ti cozydev /bin/bash`.

La commande complète est donc :
```sh
docker run --rm -it -p 8080:8080 -p 5984:5984 -p 8025:8025 -v $(pwd):/data/cozy-app -v ~/cozy/data/db:/usr/local/couchdb/data -v ~/cozy/data/storage":/data/cozy-storage --name=cozydev cozy/cozy-app-dev
```

Une fois l'image lancée, quatre URL sont accessibles :
 - `http://app.cozy.local:8080/` affiche votre application ;
 - `http://cozy.local:8080/` est le point d’entrée de l'API Cozy avec lequel communiquera votre application ;
 - `http://cozy.local:5984/` est le point d’entrée de l’API CouchDB. Pour accédez à l’application Web d’administration de la base, connectez-vous à `http://cozy.local:5984/_utils/` ;
 - `http://cozy.local:8025/` permet de visualiser les messages envoyés par le serveur.

#### Tester plusieurs applications

Vous pouvez également installer plusieurs applications. Il suffit pour cela de monter leurs dossiers respectifs dans des sous-dossiers de `/data/cozy-app`. Par exemple, pour tester files et photos, utilisez :
```sh
docker run --rm -it -p 8080:8080 -p 5984:5984 -p 8025:8025 -v "~/cozy/files":/data/cozy-app/files" -v "~/cozy/photos:/data-cozy-app/photos" --name=cozydev cozy/cozy-app-dev
```

Si vous avez déclaré les domaines dans le fichier `/etc/hosts`, les applications seront alors disponibles sur `http://files.cozy.local:8080/` et `http://photos.cozy.local:8080` .

## Développer une application

Une application pour Cozy se compose au minimum de deux fichiers :
 - un manifeste : le fichier `manifest.webapp` qui décrit l'application : son nom, les permissions dont elle a besoin, etc. Vous trouverez [ici](https://github.com/cozy/cozy-stack/blob/master/docs/apps.md#the-manifest) une description des champs disponibles ;
 - un fichier `index.html`, contenant le code de la page principale de l'application.

Pour communiquer avec le serveur, votre application aura besoin d'un certain nombre d'informations, notamment un jeton d'authentification et l’URL de l’API. Ces informations sont injectées dynamiquement dans la page `index.html` par le serveur au moment de l'envoyer au navigateur : il va remplacer certaines chaines de caractères dans la page.

Pour l'instant, les variables suivantes sont disponibles :
 - `{{.Token}}` sera remplacé par le jeton permettant d'identifier votre application auprès du serveur ;
 - `{{.Domain}}` sera remplacé par l'URL du point d'entrée de l'API ;
 - `{{.Locale}}` sera remplacé par la langue de l'instance ;
 - `{{.AppName}}` sera remplacé par le nom de l'application ;
 - `{{.IconPath}}` sera replacé par la balise HTML permettant d'afficher la /favicon/ de l'application ;
 - `{{.CozyBar}}` sera remplacé par la balise HTML injectant le script de la bibliothèque `cozy-bar` ;
 - `{{.CozyClientJS}}` sera remplacé par la balise HTML injectant le script de la bibliothèque `cozy-client-js`.

Nous reviendrons plus tard sur ces deux bibliothèques.


### Accès à l'API

Accéder à l'API du serveur nécessite d'avoir trois informations :
 - son URL : on l'obtient via la variable `{{.Domain}}` ;
 - le jeton authentifiant l'application, communiqué via la variable `{{.Token}}` ;
 - un *cookie* de session, fourni lors de l’authentification auprès de votre serveur. Ce *cookie* ne peut pas être accédé via Javascript, cela garantit donc qu'un script ne peut pas le voler et que les requêtes sont bien effectuées par une application.

Chaque requête à l'API doit comporter le *cookie* et le jeton, transmis via un entête `Authorization` de type `bearer`.

Pour récupérer le jeton et envoyer une requête à l'application, vous pouvez donc utiliser un code tel que :
```html
    <div data-cozy-token="{{.Token}}" data-cozy-domain="{{.Domain}}" />
```

```javascript
document.addEventListener('DOMContentLoaded', () => {
  "use strict";
  const app = document.querySelector('[data-cozy-token]');
  fetch(`//${app.dataset.cozyDomain}/apps`, // le point d'entrée de l'API, apps est l’API listant les applications installées
  {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${app.dataset.cozyToken}` // le jeton d'authentification
    },
    credentials: 'include' // on inclut le cookie dans la requête
  })
  .then(function (response) {
    if (response.ok) {
      response.json().then((result) => {
        console.log(result);
      });
    } else {
      throw new Error('Network response was not ok.');
    }
  })
  .catch(function (error) {
    console.log('There has been a problem with your fetch operation: ' + error.message);
  });
});
```

### Le manifeste

Pour pouvoir être installée dans Cozy, une application doit posséder un manifeste. C’est un fichier JSON nommé `manifest.webapp`, situé à la racine de l’application et contenant son nom, sa description, les permissions dont elle a besoin… 

[Exemple de manifeste](../samples/manifest.webapp).

#### Gérer les permissions

Pour accéder à la plupart des API disponibles, l'application doit demander la permission. Les permissions dont elle a besoin sont déclarées dans son manifeste (une application peut également demander dynamiquement une permission). Une permission comporte au minimum le type d'objet sur lequel elle porte, par exemple un type de documents dans la base ou une action à efectuer sur le serveur. Par défaut, on accorde tous les droits sur les objets de ce type, mais on peut aussi donner des droits plus fins, pour n'autoriser par exemple l'accès qu'en lecture. Il est également possible de restreindre les droits d'accès à quelques objets, désignés par leur identifiant ou un champ quelconque. Par exemple :
```javascript
{
  "permissions": {
    // On donne un accès complet aux fichiers
    "files": { // La valeur de cette clé est sans importance
      "description": "…", // La description sera affichée à l’installation pour expliquer pourquoi l'application nécessite cette permission
      "type": "io.cozy.files"
    },
    // Accès en lecture seule au contact dont l'adresse est toto@cozycloud.cc
    "contact": {
      "type": "io.cozy.contacts",     // Type de documents
      "verbs": ["GET"],               // Type d’accès : GET = lecture
      "selector": "email",            // Champ sur lequel s’applique la restriction
      "values": ["toto@cozycloud.cc"]
    }
  }
}
```

Une application peut obtenir un jeton associé à un sous-ensemble de ses permissions. Par exemple, elle pourra obtenir un jeton n’autorisant que l’accès en lecture à un document et passer ce jeton à une page publique que l’on partagera avec ses contacts. Ainsi, la page publique se connectera à l’API en utilisant ce jeton spécifique et n’aura qu’un accès restreint. `cozy-client-js` ne fournit [pas encore](https://github.com/cozy/cozy-client-js/issues/116) de méthodes pour gérer les permissions, il vous faudra donc appeler manuellement l’[API permissions](https://github.com/cozy/cozy-stack/blob/master/docs/permissions.md).


#### Routage

Toutes les routes utilisées par votre application doivent être déclarées dans son manifeste. Une route associe à une URL un fichier HTML dans un dossier, et précise si la route est privée (c'est à dire accessible uniquement à l'utilisateur connecté) ou publique. Par exemple :
```javascript
"routes": {
  "/admin": {
    "folder": "/",
    "index": "admin.html",
    "public": false
  },
  "/public": {
    "folder": "/public",
    "index": "index.html",
    "public": true
  },
  "/assets": {
    "folder": "/assets",
    "public": true
  }
}
```

### Utiliser `cozy-client-js`

`cozy-client-js` est une bibliothèque simplifiant la communication avec l'API du serveur. Vous pouvez l'inclure automatiquement dans votre application en ajoutant `{{.CozyClientJS}}` au code du fichier `index.html`.

Toutes ses fonctions sont disponibles dans l’objet global `window.cozy.client`.

Cette bibliothèque enrobe les API du serveur qui permettent de gérer l’authentification et les paramètres du serveur, et de manipuler documents et fichiers. Elle offre également des méthodes utiles pour permettre aux applications de fonctionner sans connexion réseau (mode *offline*).

On peut utiliser la bibliothèque de deux manières : soit en créant un nouvel objet et appelant ses méthodes, soit en appelant directement les fonctions de l’objet global. Dans ce dernier cas, un appel initial à `cozy.client.init()` est requis. Lors de l’initialisation, deux options sont requises : l’URL du point d’entrée de l’API, et le jeton d’authentification.

Par ailleurs, on peut utiliser deux paradigmes de programmation avec la bibliothèque : par défaut, chaque méthode retourne une `Promise`, mais vous pouvez aussi utiliser des fonctions de rappel. Il suffit pour cela de passer l’option `disablePromises: true` à la bibliothèque.

Voici quelques exemples d’utilisation :

```javascript
  var options, client1, client2;
  options = {
    cozyURL: `//${app.cozyDomain}`,
    token: app.cozyToken
  };

  // Appel direct
  cozy.client.init(options);
  cozy.client.settings.diskUsage()
    .then(function (usage) {console.log('Usage (promise)', usage);});
    .catch(function(err){ console.log(’fail’, err); });

  // Via un objet
  client1 = new cozy.client.Client(options);
  // Avec des Promise
  client1.settings.diskUsage()
    .then(function (usage) {console.log('Usage (promise)', usage);});
    .catch(function(err){ console.log(’fail’, err); });
  // Avec une fonction
  options.disablePromises = true;
  client2 = new cozy.client.Client(options);
  client2.settings.diskUsage(function (err, res) {
    console.log('Usage (callback)', err, res);
  });
});
```

*Note :* la bibliothèque ne fournit pas encore de méthodes pour l’ensemble des API du serveur. Si vous voulez utiliser une API qui n’est pas encore disponible, vous pouvez naturellement vous rabattre sur `XMLHttpRequest` ou `fetch`.

#### Référence de l’API

Ce tutoriel ne vise qu’à faire un tour d’horizon des principales fonctionnalités de la bibliothèque. Pour une référence complète des fonctions avec des exemples d’usage, référez-vous à [la documentation de la bibliothèque](https://github.com/cozy/cozy-client-js/tree/master/docs).

#### Manipuler des documents

Dans Cozy, tous les documents ont un type. Pour éviter que plusieurs applications ne créent le même type de documents avec des formats différents, nous avons décidé de nommer les types en suivant [la spécification Java](https://docs.oracle.com/javase/specs/jls/se8/html/jls-6.html#d5e8195) : tous les types de documents sont donc préfixés par un nom de domaine écrit à l’envers ou, si vous ne possédez pas de nom de domaine, par votre adresse de courriel. Les types définis par Cozy sont préfixés par `io.cozy.` ou `io.cozy.labs`. Si votre adresse est `toto@nuage.douye`, préfixez vos types par `douye.nuage.toto`. Vous n’avez évidemment pas le droit de modifier des types de documents ne vous « appartenant » pas.

Rappel : pour pouvoir accéder à des documents, vous devez explicitement en avoir demandé la permission dans le manifeste de votre application.

Toutes les méthodes de manipulation de documents sont regroupées dans l’espace de nom `cozy.client.data`. On trouvera pas exemple :
 - `create(doctype, attributes)`, `update(doctype, doc, newdoc)`, `delete(doctype, doc)` permettent de créer, mettre à jour et supprimer un document ;
 - on peut également ne mettre à jour que certains de ses attributs avec `updateAttributes(doctype, id, changes)` ;
 - `find(doctype, id)` récupère un document via son identifiant interne ;
 - `changesFeed(doctype, options)` retourne les dernières opérations sur des documents d’un type ;

Pour accéder à des documents en fonction de critères aléatoires, il faut d’abord créer un index sur certains champs des documents puis effectuer une requête sur cet index. On utilise `defineIndex(doctype, fields)` et `query(indexReference, query)`. Par exemple, pour chercher un contact en fonction de son adresse de messagerie, on créera un index sur ce champ et interrogera l’index :
```javascript
cozy.client.data.defineIndex("io.cozy.contacts", ["email"])
.then((index) => {
  return cozy.data.query(index, {"selector": {email: "contact@cozycloud.cc"}})
})
.then( (result) => {
  console.log(result[0].name);
});
```
La recherche utilise l’API [Mango](https://github.com/cloudant/mango) disponible dans CouchDB 2.


#### Manipuler des fichiers

À la différence de Cozy V2, Cozy ne stocke pas les fichiers dans la base de données, mais dans un système de fichiers virtuel, qui peut utiliser diverses technologies : le système de fichiers réel du serveur ou des systèmes distants (les méta-données des fichiers sont quand à elles toujours dans la base).

La bibliothèque `cozy.client` offre de nombreuses méthodes pour manipuler les fichiers, regroupées dans l’espace de nom `cozy.client.files`. Par exemple :
 - `create()` et `updateById()` pour créer et mettre à jour un fichier ;
 - `createDirectory()` pour créer un dossier ;
 - `updateAttributesById()` et `updateAttributesByPath()` pour modifier les meta-données ;
 - pour supprimer un fichier ou un dossier, on peut soit le déplacer dans une poubelle (`trashById()`) d’où il sera possible de le récupérer via `restoreById()`, soit l’éradiquer définitivement avec `destroyById (`trashById()`). On peut également afficher le contenu de la poubelle (`listTrash()`) et supprimer l’ensemble de son contenu (`clearTrash()`). 
 - `downloadById(id)` et `downloadByPath(path)` permettent de télécharger un fichier ;
 - `getDownloadLinkById(id)` et `getDownloadLinkByPath(path)` retournent une URL de téléchargement valable une heure ;
 - `getArchiveLink(paths, name)` retourne une URL temporaire permettant de télécharger une archive Zip de tous les fichiers d’un dossier ;
 - on peut lier un fichier à un document avec `addReferencedFiles(doc, fileIds)` et lister tous les fichiers liés à un document avec `listReferencedFiles(doc)`.


#### Gérer le serveur

La bibliothèque fournit également des méthodes pour obtenir des informations sur votre serveur et l’administrer. Par exemple :
 - `cozy.client.settings.diskUsage()` retourne des information sur l’utilisation du disque ;
 - `cozy.client.settings.changePassphrase(oldPassphrase, newPassphrase)` pour changer le mot de passe de connexion ;
 - `cozy.client.settings.getInstance()` récupère diverses informations, telles que le nom et l’adresse de messagerie de l’utilisatrice et la langue de l’instance ;
 - `cozy.client.settings.updateInstance(instance)` pour mettre à jour ces informations ;
 - …


#### Travailler sans réseau

TODO


#### Déclencher des tâches périodiques

TODO


### La `cozy-bar`

C’est une bibliothèque qui offre des fonctions pour intégrer votre application dans l’environnement Cozy. Elle va par exemple afficher la barre de menu en haut de l’application.

Pour l’utiliser, ajoutez seulement `{{.CozyBar}}` dans le code de votre page principale, et le serveur injectera automatiquement la bibliothèque. Vous devez également avoir un élément avec les attributs `role="application"`, `data-cozy-domain=""` et `data-cozy-token=""`. La barre de menu sera insérée avant cet élément. Le code de votre page principale devrait donc contenir :

```html
  <div role="application" data-cozy-token="{{.Token}}" data-cozy-domain="{{.Domain}}" />
```

Toutes ses fonctions sont disponibles dans l’objet global `window.cozy.bar`. Pour initialiser la bibliothèque et afficher la barre de menu, utilisez simplement `window.cozy.bar.init({appName: "Mon application"})`.


### Avec du style

Nous développons une bibliothèque, [cozy-ui](https://github.com/cozy/cozy-ui/tree/v3#use), contenant de nombreux styles. Vous pouvez l’inclure dans votre projet pour rapidement calquer l’apparence de votre application sur celle de Cozy.


### Exécuter des tâches sur le serveur

Parfois, votre application a besoin d’exécuter des traitements sur le serveur.

Cozy utilise pour cela des tâches (`jobs`) qui peuvent être lancées manuellement ou en réponse à des déclencheurs (`triggers`).

Il est possible de définir plusieurs types de déclencheurs, pour exécuter la tâche à une certaine heure ou au bout d’un certain interval, une seule fois ou de manière récurrente. On peut également déclencher une tâche en réponse à un évènement interne à Cozy, ou externe. Pour plus de détails, consultez la [documentation de référence des déclencheurs](https://cozy.github.io/cozy-stack/jobs.html#triggers).

Pour l’heure, il n’est pas possible de créer ses propres tâches, mais uniquement celles fournies par la plateforme.

Pour pouvoir lancer des tâches sur le serveur, votre application doit en avoir demandé la permission, via le type d’objets `io.cozy.jobs`. On peut restreindre les permissions à certaines tâches. Par exemple, pour envoyer des messages, on demandera la permission d’utiliser la tâche `sendmail` :
```json
{
  "permissions": {
    "mail-from-the-user": {
      "type": "io.cozy.jobs",
      "selector": "worker",
      "verbs": ["POST"],
      "values": ["sendmail"]
    }
  }
}
```
De même, pour créer des déclencheurs, il faudra demander la permission pour le type d'objets `io.cozy.triggers`.

Il n'existe pas encore de méthode dans `cozy-client-js` pour créer et déclencher des tâches, on fera donc [directement appel à l'API](https://github.com/cozy/cozy-stack/blob/master/docs/jobs.md#post-jobsqueueworker-type).

Les tâches actuellement disponibles sont :
 - `sendmail` pour envoyer un message ;

On se rapportera à la [documentation complète des tâches](https://cozy.github.io/cozy-stack/workers.html) pour connaître les arguments de chaque tâche.

*Exemple* : pour envoyer un message :
```javascript
  fetchOptions = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${app.cozyToken}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({
      data: {
        arguments: {
          mode: "from",
          to: "root",
          subject: "test",
          parts: [
            {
              type: "text/plain",
              body: "Hey !"
            }
          ]
        },
        options: {}
      }
    })
  };
  fetch(`//${app.cozyDomain}/jobs/queue/sendmail`, fetchOptions)
  .then(function (response) {
    if (response.ok) {
      response.json().then((res) => {
        console.log(res);
      });
    } else {
      throw new Error('Network response was not ok.');
    }
  })
  .catch(function (error) {
    console.log('There has been a problem with your fetch operation: ' + error.message);
  });

```

## Administrer l'instance de développement.

Vous pouvez ouvrir une console dans l'instance de développement au moyen de `docker exec -ti cozydev /bin/bash`. Cela vous permet d'utiliser la commande `cozy-stack` pour administrer l'instance.

{% endraw %}
