import chai, { expect } from 'chai';

// helpers
import wordFrequency from 'server/helpers/wordFrequency';

chai.config.includeStack = true;

const text = 'Node.js is an open-source, cross-platform JavaScript run-time environment that executes JavaScript code outside of a browser. Node.js lets developers use JavaScript to write command line tools and for server-side scripting—running scripts server-side to produce dynamic web page content before the page is sent to the user\'s web browser. Consequently, Node.js represents a "JavaScript everywhere" paradigm,[7] unifying web application development around a single programming language, rather than different languages for server- and client-side scripts.\n' +
  '\n' +
  'Though .js is the standard filename extension for JavaScript code, the name "Node.js" does not refer to a particular file in this context and is merely the name of the product. Node.js has an event-driven architecture capable of asynchronous I/O. These design choices aim to optimize throughput and scalability in web applications with many input/output operations, as well as for real-time Web applications (e.g., real-time communication programs and browser games).[8]\n' +
  '\n' +
  'The Node.js distributed development project, governed by the Node.js Foundation,[9] is facilitated by the Linux Foundation\'s Collaborative Projects program.[10]\n' +
  '\n' +
  'Corporate users of Node.js software include GoDaddy,[11] Groupon,[12] IBM,[13] LinkedIn,[14][15] Microsoft,[16][17] Netflix,[18] PayPal,[19][20] Rakuten, SAP,[21] Voxer,[22] Walmart,[23] and Yahoo!.[24]\n' +
  'Ryan Dahl, creator of Node.js, in 2010\n' +
  'Node.js was written initially by Ryan Dahl in 2009,[25] about thirteen years after the introduction of the first server-side JavaScript environment, Netscape\'s LiveWire Pro Web.[26] The initial release supported only Linux and Mac OS X. Its development and maintenance was led by Dahl and later sponsored by Joyent.[27]\n' +
  '\n' +
  'Dahl criticized the limited possibilities of the most popular web server in 2009, Apache HTTP Server, to handle a lot of concurrent connections (up to 10,000 and more) and the most common way of creating code (sequential programming), when code either blocked the entire process or implied multiple execution stacks in the case of simultaneous connections.[28]\n' +
  '\n' +
  'Dahl demonstrated the project at the inaugural European JSConf on November 8, 2009.[29][30][31] Node.js combined Google\'s V8 JavaScript engine, an event loop, and a low-level I/O API.[32]\n' +
  '\n' +
  'In January 2010, a package manager was introduced for the Node.js environment called npm.[33] The package manager makes it easier for programmers to publish and share source code of Node.js libraries and is designed to simplify installation, updating, and uninstallation of libraries.[32]\n' +
  '\n' +
  'In June 2011, Microsoft and Joyent implemented a native Windows version of Node.js.[34] The first Node.js build supporting Windows was released in July 2011.\n' +
  '\n' +
  'In January 2012, Dahl stepped aside, promoting coworker and npm creator Isaac Schlueter to manage the project.[35] In January 2014, Schlueter announced that Timothy J. Fontaine would lead the project.[36]\n' +
  '\n' +
  'In December 2014, Fedor Indutny started io.js, a fork of Node.js. Due to the internal conflict over Joyent\'s governance, io.js was created as an open governance alternative with a separate technical committee.[37][38] Unlike Node.js,[39] the authors planned to keep io.js up-to-date with the latest releases of the Google V8 JavaScript engine.[40]\n' +
  '\n' +
  'In February 2015, the intent to form a neutral Node.js Foundation was announced. By June 2015, the Node.js and io.js communities voted to work together under the Node.js Foundation.[41]\n' +
  '\n' +
  'In September 2015, Node.js v0.12 and io.js v3.3 were merged back together into Node v4.0.[42] This merge brought V8 ES6 features into Node.js and a long-term support release cycle.[43] As of 2016, the io.js website recommends that developers switch back to Node.js and that no further releases of io.js are planned due to the merge.[44]\n' +
  '\n' +
  'Overview\n' +
  'Node.js allows the creation of Web servers and networking tools using JavaScript and a collection of "modules" that handle various core functionality.[29][32][45][46][47] Modules are provided for file system I/O, networking (DNS, HTTP, TCP, TLS/SSL, or UDP), binary data (buffers), cryptography functions, data streams, and other core functions.[32][46][48] Node.js\'s modules use an API designed to reduce the complexity of writing server applications.[32][46]\n' +
  '\n' +
  'Though initially the module system was based on commonjs module pattern, the recent introduction of modules in the ECMAScript specification has shifted the direction of using ECMAScript Modules in Node.js by default instead.[49]\n' +
  '\n' +
  'Node.js is officially supported on Linux, macOS and Microsoft Windows 7 and Server 2008 (and later)[4], with tier 2 support for SmartOS and IBM AIX and experimental support for FreeBSD. OpenBSD also works, and LTS versions available for IBM i (AS/400).[50] The provided source code may also be built on similar operating systems to those officially supported or be modified by third parties to support others such as NonStop OS[51] and Unix servers. Alternatively, it can be written with CoffeeScript[52] (a JavaScript alternative), Dart or TypeScript (strongly typed forms of JavaScript), or any other language that can compile to JavaScript.[52][53]\n' +
  '\n' +
  'Node.js is primarily used to build network programs such as Web servers.[45] The most significant difference between Node.js and PHP is that most functions in PHP block until completion (commands only execute after previous commands finish), while Node.js functions are non-blocking (commands execute concurrently or even in parallel,[54][55] and use callbacks to signal completion or failure).[45]\n' +
  '\n' +
  'Platform architecture\n' +
  'Node.js brings event-driven programming to web servers, enabling development of fast web servers in JavaScript.[32] Developers can create scalable servers without using threading, by using a simplified model of event-driven programming that uses callbacks to signal the completion of a task.[32] Node.js connects the ease of a scripting language (JavaScript) with the power of Unix network programming.[32]\n' +
  '\n' +
  'Node.js was built on the Google V8 JavaScript engine since it was open-sourced under the BSD license. It is proficient with internet fundamentals such as HTTP, DNS, TCP.[29] JavaScript was also a well-known language, making Node.js accessible to the web development community.[29]\n' +
  '\n' +
  'Industry support\n' +
  'There are thousands of open-source libraries for Node.js, most of them hosted on the npm website. The Node.js developer community has two main mailing lists and the IRC channel #node.js on freenode. There are multiple developer conferences and events that support the Node.js community including NodeConf, Node Interactive and Node Summit as well as a number of regional events.\n' +
  '\n' +
  'The open-source community has developed web frameworks to accelerate the development of applications. Such frameworks include Connect, Express.js, Socket.IO, Feathers.js, Koa.js, Hapi.js, Sails.js, Meteor, Derby, and many others.[32][56] Various packages have also been created for interfacing with other languages or runtime environments such as Microsoft .NET.[57]\n' +
  '\n' +
  'Modern desktop IDEs provide editing and debugging features specifically for Node.js applications. Such IDEs include Atom, Brackets, JetBrains WebStorm,[58][59] Microsoft Visual Studio (with Node.js Tools for Visual Studio,[60] or TypeScript with Node definitions,[61][62][63][64]) NetBeans,[65] Nodeclipse Enide Studio[66] (Eclipse-based), and Visual Studio Code.[67][68] Certain online web-based IDEs also support Node.js, such as Codeanywhere, Codenvy, Cloud9 IDE, Koding, and the visual flow editor in Node-';

describe('Word Frequency', () => {
  it('should return correct text stats excluding grammatical words', () => {
    const excludingStopwords = wordFrequency(text);

    expect(excludingStopwords[0].value).to.be.eq(46);
    expect(excludingStopwords[1].value).to.be.eq(16);
    expect(excludingStopwords[2].value).to.be.eq(14);

    const withStopword = wordFrequency(text, { stopword: false });

    expect(withStopword[0].value).to.be.eq(54);
    expect(withStopword[1].value).to.be.eq(46);
    expect(withStopword[2].value).to.be.eq(40);
    expect(withStopword[3].value).to.be.eq(16);
    expect(withStopword[4].value).to.be.eq(14);
    expect(withStopword[5].value).to.be.eq(14);
    expect(withStopword[6].value).to.be.eq(10);
    expect(withStopword[7].value).to.be.eq(10);
  });
});
