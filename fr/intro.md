{% raw %}

# Développer une application pour Cozy V3

Dans Cozy V3, toutes les applications sont des applications HTML5 exécutées dans le navigateur et communiquant avec l'API du serveur. Pour développer une application, vous aurez donc besoin de disposer d'un serveur exposant l'API Cozy.

## Installer l'environnement

La méthode la plus simple et la plus rapide pour disposer d'un tel serveur est d'utiliser l'image Docker que nous mettons à disposition. Vous aurez pour cela besoin d'avoir Docker.

Pour récupérer l'image :
```sh
docker pull cozy/cozy-app-dev
```

Puis, pour lancer le serveur et lui demander de servir votre applications (que vous développez dans le dossier `~/gozy/monapp`) :
```sh
docker run --rm -it -p 8080:8080 -p 5984:5984 -v ~/gozy/monapp:/data/cozy-app cozy/cozy-app-dev
```

Quelques explications :
 - `--rm -it` : `rm` permet de supprimer l'instance lorsque vous la couperez, `it` d'avoir sa sortie affichée dans la fenêtre ;
 - `-p 8080:8080` : le serveur Gozy écoute sur le port 8080 de la machine virtuelle, on redirige ce port vers le port 8080 de votre machine. Pour utiliser un autre port de votre machine, utilisez par exemple `-p 9090:8080` ;
 - `-p 5984:5984` : expose le CouchDB du serveur sur le port 5984 de votre machine. Vous pourrez ainsi accéder à une interface de gestion de la base de données sur `http://cozy.local:5984/_utils/` ;
 - `-v ~/gozy/monapp:/data/cozy-app` : cela permet de monter le dossier local `~/gozy/monapp` sur le dossier `/data/cozy-app` du serveur. C'est dans ce dossier que Gozy s'attend à trouver le code de votre application.

Vous pouvez alors vous connecter à l'URL `http://app.cozy.local:8080/#` pour commencer à tester votre application (après vous être identifié⋅e — le mot de passe par défaut est `cozy`).

En procédant ainsi, il n'y a aucune persistance de données : chaque fois que vous relancez une machine virtuelle, elle utilisera une base de données vierge. Pour stocker la base de données et le système de fichiers du serveur sur votre machine locale, vous devez monter respectivement les dossiers `/usr/local/couchdb/data` et `/data/cozy-storage` du serveur sur des dossiers locaux : `-v ~/gozy/data/db:/usr/local/couchdb/data -v ~/gozy/data/storage":/data/cozy-storage`.

Enfin, pour accéder plus facilement à la machine virtuelle, je vous conseille de lui donner un nom : `--name=cozydev`. Vous pourrez ainsi lancer un shell dans l'instance avec `docker exec -ti cozydev /bin/bash`.

La commande complète est donc :
```sh
docker run --rm -it -p 8080:8080 -p 5984:5984 -v ~/gozy/monapp:/data/cozy-app -v ~/gozy/data/db:/usr/local/couchdb/data -v ~/gozy/data/storage":/data/cozy-storage --name=cozydev cozy/cozy-app-dev
```

Une fois l'image lancée, trois URL sont accessibles :
 - `http://app.cozy.local:8080/` affiche votre application ;
 - `http://cozy.local:8080/` est le point d’entrée de l'API Cozy avec lequel communiquera votre application ;
 - `http://cozy.local:5984/` est le point d’entrée de l’API CouchDB. Pour accédez à l’application Web d’administration de la base, connectez-vous à `http://cozy.local:5984/_utils/`


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

### Gérer les permissions

Pour accéder à la plupart des API disponibles, l'application doit demander la permission. Les permissions dont elle a besoin sont déclarées dans son manifeste. Une permission comporte au minimum le type d'objet sur lequel elle porte, par exemple un type de documents dans la base. Par défaut, on accorde tous les droits sur les objets de ce type, mais on peut aussi donner des droits plus fins, pour n'autoriser par exemple l'accès qu'en lecture. Il est également possible de restreindre les droits d'accès à quelques objets, désignés par leur identifiant ou un champ quelconque. Par exemple :
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

#### Référence de l’API

Ce tutoriel ne vise qu’à faire un tour d’horizon des principales fonctionnalités de la bibliothèque. Pour une référence complète des fonctions avec des exemples d’usage, référez-vous à [la documentation de la bibliothèque](https://github.com/cozy/cozy-client-js/tree/master/docs).

#### Manipuler des documents

Dans Cozy, tous les documents ont un type. Pour éviter que plusieurs applications ne créent le même type de documents avec des formats différents, nous avons décider de nommer les types en suivant [la spécification Java](https://docs.oracle.com/javase/specs/jls/se8/html/jls-6.html#d5e8195) : tous les types de documents sont donc préfixés par un nom de domaine écrit à l’envers ou, si vous ne possédez pas de nom de domaine, par votre adresse de courriel. Les types définis par Cozy sont préfixés par `io.cozy.` ou `io.cozy.labs`. Si votre adresse est `toto@nuage.douye`, préfixez vos types par `douye.nuage.toto`. Vous n’avez évidemment pas le droit de modifier des types de documents ne vous « appartenant » pas.

Rappel : pour pouvoir accéder à des documents, vous devez explicitement en avoir demandé la permission dans le manifeste de votre application.

Toutes les méthodes de manipulation de documents sont regroupées dans l’espace de nom `cozy.client.data`. On trouvera pas exemple :
 - `create(doctype, attributes)`, `update(doctype, doc, newdoc)`, `delete(doctype, doc)` permettent de créer, mettre à jour et supprimer un document ;
 - on peut également ne mettre à jour que certains de ses attributs avec `updateAttributes(doctype, id, changes)` ;
 - `find(doctype, id)` récupère un document via son identifiant interne ;
 - `changesFeed(doctype, options)` retourne les dernières opérations sur des documents d’un type ;

Pour accéder à des documents en fonction de critères aléatoires, il faut d’abord créer un index sur certains champs des documents puis effectuer une requête sur cet index. On utilise `defineIndex(doctype, fields)` et `query(indexReference, query)`. Par exemple, pour chercher un contact en fonction de son adresse de messagerie, on créera un index sur ce champ et interrogera l’index :
```javascript
cozy.client.data.defineIndex("io.cozy.contacts", ["email"])
  .then( (index) => {
    cozy.data.query(index, {"selector": {email: "contact@cozycloud.cc"}})
      then( (result) => {
        console.log(result[0].name);
      });
  })
```
La recherche utilise l’API [Mango](https://github.com/cloudant/mango) disponible dans CouchDB 2.


#### Manipuler des fichiers

À la différence de Cozy V2, Gozy ne stocke pas les fichiers dans la base de données, mais dans un système de fichiers virtuel, qui peut utiliser diverses technologies : le système de fichiers réel du serveur ou des systèmes distants (les méta-données des fichiers sont quand à elles toujours dans la base).

La bibliothèque `cozy.client` offre de nombreuses méthodes pour manipuler les fichiers, regroupées dans l’espace de nom `cozy.client.files`. Par exemple :
 - `create()` et `updateById()` pour créer et mettre à jour un fichier ;
 - `createDirectory()` pour supprimer un dossier ;
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


### Routage

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

### Le manifeste

TODO


## Administrer l'instance de développement.

Vous pouvez ouvrir une console dans l'instance de développement au moyen de `docker exec -ti cozydev /bin/bash`. Cela vous permet d'utiliser la commande `cozy-stack` pour administrer l'instance.

{% endraw %}
