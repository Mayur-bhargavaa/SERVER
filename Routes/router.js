const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { User, Product, Banner, Banner1,Sunglasses} = require("../Model/model");
const sendVerificationEmail = require("../Email_verification");
const router = express.Router();
const fs = require('fs');
const faqRouter = require('./faq.json');
const JWT_SECRET = generateVerificationToken();
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
const mongoose = require('mongoose');
const loadFaqData = () => {
  const data = fs.readFileSync('./faq.json', 'utf8');
  return JSON.parse(data);
};
// const Grid = require('gridfs-stream');

//                       FOR IMAGE UPLOAD
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/'); // Set the destination folder for storing uploaded images
//   },
//   filename: function (req, file, cb) {
//     const ext = path.extname(file.originalname);
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + ext);
//   },
// });

// const upload = multer({ storage: storage });

function jaccardSimilarity(question1, question2) {
  let setA = new Set(question1.split(' '));
  let setB = new Set(question2.split(' '));
  let intersection = new Set([...setA].filter(x => setB.has(x)));
  let union = new Set([...setA, ...setB]);
  return intersection.size / union.size;  // returns a value between 0 and 1
}
// app.use('/api', faqRouter);

function getAnswerAndRelated(userQuestion) {
  const faqs = loadFaqData();
  let bestMatch = { answer: "Sorry, I don't understand the question.", score: 0 };
  let relatedQuestions = [];

  faqs.forEach(faq => {
      let similarityScore = jaccardSimilarity(userQuestion, faq.question);
      if (similarityScore > bestMatch.score) {
          bestMatch = { answer: faq.answer, score: similarityScore };
      }
      if (similarityScore > 0.1 && similarityScore < 0.9) {  // Thresholds for related questions
          relatedQuestions.push({ question: faq.question, score: similarityScore });
      }
  });

  // Sort the related questions by their similarity score in descending order
  relatedQuestions.sort((a, b) => b.score - a.score);

  // Slice the array to get only the top 5 related questions
  let topRelatedQuestions = relatedQuestions.slice(0, 5).map(q => q.question);

  return { answer: bestMatch.answer, related: topRelatedQuestions };
}
//                       FOR TOKEN GENERATION

function generateVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return token;
}

//                        FOR AUTHENTICATION

const authenticate = (req, res, next) => {
  const authorizationHeader = req.header('Authorization');
  if (!authorizationHeader) {
    return res.status(401).send({ error: 'Please provide the Authorization header' });
  }
  const token = authorizationHeader.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate.' });
  }
};

router.get("/", async (req, res) => {
  return res
      .status(200)
      .json({ message: "Welcome to your API!" });
})

//                           FOR SIGNUP USER 

router.post("/signup", async (req, res) => {
  const { name, email, password, cpassword } = req.body;
  if (password !== cpassword) {
    return res
      .status(400)
      .json({ error: "Password and Confirm Password do not match" });
  }
  try {
    const verificationToken = generateVerificationToken();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedcPassword = await bcrypt.hash(cpassword, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      cpassword: hashedcPassword,
      verificationToken,
      address:[],
      orders: [],
    });
    await newUser.save();
    await sendVerificationEmail(email, verificationToken, name);
    res.json({ message: "Signup successful" });
  } catch (error) {
    res.status(500).json({ error: "Error signing up" });
  }
});

//                           FOR LOGIN USER

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // if (!user.isVerified) {
    //   return res.status(400).json({ error: "Email not verified" });
    // }
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token, message: "Login successful" });
  } catch (error) {
    res.status(500).json({ error: "Error finding user" });
  }
});

//                       FOR LOGOUT USER 

router.post("/logout", async (req, res) => {
  res.json({ message: "Logout successful" });
});

//                        FOR USER USERNAME

router.get("/users", (req, res) => {
  User.find()
    .then((users) => {
      res.json(users);
    })
    .catch((error) => {
      res.status(500).json({ error: "Error retrieving users" });
    });
});

//                           FOR VERIFY USER BY TOKEN 

router.get("/verify", async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.render("emailnotverified");
    }
    if (user.isVerified) {
      return res.render("alreadyverified"); 
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();
    res.render("emailverified");
  } catch (error) {
    console.error("Error verifying user:", error);
    res.render("emailnotverified");
  }
});
//                                   FOR USER DATA 


router.get("/user", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId; 
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ name: user.name, email: user.email });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Error fetching user" });
  }
});

//                            For Banner Container

router.get('/api/banner', async (req, res) => {
  try {
    const bannerData = await Banner.find({});
    res.json(bannerData);
  } catch (error) {
    console.error('Error fetching banner data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//                                For second  Banner Container

router.get('/api/banner1', async (req, res) => {
  try {
    const bannerData = await Banner1.find({});
    res.json(bannerData);
  } catch (error) {
    console.error('Error fetching banner data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//                                For Product

router.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//                           For Detail Page

router.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send();
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/api/Sunglasses/:id', async (req, res) => {
  try {
    const product = await Sunglasses.findById(req.params.id);
    if (!product) {
      return res.status(404).send();
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/api/Sunglasses', async (req, res) => {
  try {
    const product = await Sunglasses.find();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//               For Address Update 

router.post("/addresses", async (req, res) => {
  try {
    const { userId, address } = req.body;

    // Check if userId is a non-empty string
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return res.status(400).json({ message: "Invalid userId provided" });
    }

    // Find the user by the userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add the new address to the user's addresses array
    user.addresses.push(address);

    // Save the updated user in the backend
    await user.save();

    res.status(200).json({ message: "Address created successfully" });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//                      For Get the Address

router.get("/user/addresses", authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.addresses);
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({ error: "Error fetching addresses" });
  }
});

//                    For Get the User Details 

router.put('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(userId, { name }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ name: user.name });
  } catch (error) {
    console.error('Error updating username:', error);
    res.status(500).json({ error: 'Error updating username' });
  }
}); 

//                       For User Address Update 

router.put('/user/addresses/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    const addressUpdate = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).send('Address not found');
    }
    address.set(addressUpdate);
    await user.save();
    res.json(address);
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(500).json({ error: 'Error updating address' });
  }
});

//                      For User Address Delete

router.delete('/user/addresses/:id', authenticate, async (req, res) => {
  try {
    const userId = req.user.userId;
    const addressId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send('User not found');
    }
    const addressIndex = user.addresses.findIndex(address => address.id === addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ message: 'Address not found' });
    }
    user.addresses.splice(addressIndex, 1);
    await user.save();
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ message: 'Internal Server Error',error });
  }
});


// In your backend route handler
// In your backend route handler
router.post("/schedule", authenticate, async (req, res) => {
  try {
    const { userId, doctor, date, paymentId } = req.body;

    // Check if userId is a non-empty string
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      return res.status(400).json({ message: "Invalid userId provided" });
    }

    // Find the user by the userId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Add the new scheduling data to the user's Scheduling array
    user.Scheduling.push({ doctor, date, paymentId });

    // Save the updated user in the backend
    await user.save();

    res.status(200).json({ message: "Scheduling data stored successfully" });
  } catch (error) {
    console.error("Error storing scheduling data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

//                         FOR IMAGE LOGIC

// router.post('/user/image', authenticate, upload.single('profileImage'), async (req, res) => {
//   try {
//     const userId = req.user.userId;
//     const user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Remove existing image if present
//     if (user.imageUrl) {
//       const imagePath = path.join(__dirname, '..', 'uploads', user.imageUrl);
//       if (fs.existsSync(imagePath)) {
//         fs.unlinkSync(imagePath);
//       }
//     }

//     // Save new image URL to the user
//     user.imageUrl = req.file.filename;
//     await user.save();

//     res.json({ imageUrl: user.imageUrl });
//   } catch (error) {
//     console.error('Error updating profile image:', error);
//     res.status(500).json({ error: 'Error updating profile image' });
//   }
// });
// router.get("/user/image/:userId", async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     // Assuming your User model has a field named 'imageUrl'
//     const user = await User.findById(userId);

//     if (!user || !user.imageUrl) {
//       // Return a default image or an error image
//       return res.status(404).sendFile(path.join(__dirname, "path/to/default-image.jpg"));
//     }

//     // Construct the path to the image file
//     const imagePath = path.join(__dirname, "uploads", user.imageUrl);

//     // Serve the image file
//     res.sendFile(imagePath);
//   } catch (error) {
//     console.error("Error fetching user image:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
router.post('/ask', (req, res) => {
  const userQuestion = req.body.question.toLowerCase();
  const result = getAnswerAndRelated(userQuestion);
  res.json({ answer: result.answer, related: result.related });
});

module.exports = router;
