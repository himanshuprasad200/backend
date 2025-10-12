const Project = require("../models/projectModel");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const ApiFeatures = require("../utils/apifeatures");
const ErrorHandler = require("../utils/errorHandler");
const cloudinary = require("cloudinary");

//Create Project
exports.createProject = catchAsyncErrors(async (req, res, next) => {
  let images = [];

  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }
 
  const imagesLink = [];

  for (let i = 0; i < images.length; i++) {
    const result = await cloudinary.v2.uploader.upload(images[i], {
      folder: "projects",
    });
    imagesLink.push({
      public_id: result.public_id,
      url: result.secure_url,
    });
  }

  req.body.images = imagesLink;
  req.body.user = req.user.id;
  req.body.postedBy = req.user.id;
  const project = await Project.create(req.body);

  res.status(201).json({
    success: true,
    project,
  }); 
});

// Get All Projects
exports.getAllProjects = catchAsyncErrors(async (req, res) => {
  const resultPerPage = 8;
  const projectsCount = await Project.countDocuments();
  
  // Create an ApiFeatures instance with sorting
  const apiFeature = new ApiFeatures(Project.find().sort({ createdAt: -1 }), req.query) // Add sorting by createdAt in descending order
    .search()
    .filter()
    .pagination(resultPerPage);

  const projects = await apiFeature.query;

  res.status(200).json({
    success: true,
    projects,
    projectsCount,
    resultPerPage, 
  });
});


//Get All Projects -- Admin only
exports.getAdminProjects = catchAsyncErrors(async (req, res) => {
  const projects = await Project.find();

  res.status(200).json({
    success: true,
    projects,
  });
});

// Get Project Details
exports.getProjectDetails = catchAsyncErrors(async (req, res, next) => {
  const project = await Project.findById(req.params.id).populate(
    "postedBy",
    "name avatar country"
  );

  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  res.status(200).json({
    success: true,
    project,
  });
});

//Upadate Project
exports.updateProject = catchAsyncErrors(async (req, res, next) => {
  let project = await Project.findById(req.params.id); // Await the result of findById

  if (!project) {
    return next(new ErrorHandler("Project not found", 404));
  }

  let images = [];

  if (typeof req.body.images === "string") {
    images.push(req.body.images);
  } else {
    images = req.body.images;
  }

  if (images !== undefined) {
    // DELETING IMAGES FROM CLOUDINARY
    for (let i = 0; i < project.images.length; i++) {
      await cloudinary.v2.uploader.destroy(project.images[i].public_id);
    }

    const imagesLink = [];

    for (let i = 0; i < images.length; i++) {
      const result = await cloudinary.v2.uploader.upload(images[i], {
        folder: "projects",
      });
      imagesLink.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }
    req.body.images = imagesLink;
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    project,
  });
});


//DELETE Project - CLIENT
exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return next(new ErrorHandler("Project not found", 404));
    }

    // DELETING IMAGES FROM CLOUDINARY
    for (let i = 0; i < project.images.length; i++) {
      await cloudinary.v2.uploader.destroy(project.images[i].public_id);
    }

    await Project.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: "Project Deleted Successfully",
    });
  } catch (error) {
    // Handle any errors that might occur during deletion
    console.error("Error deleting Project:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting Project",
    });
  }
};

// CREATE NEW REVIEW OR UPDATE REVIEW
exports.createProjectReview = catchAsyncErrors(async (req, res, next) => {
  const { rating, comment, projectId } = req.body;
  const review = {
    user: req.user._id,
    name: req.body.name,
    rating: Number(rating),
    comment,
  };

  const project = await Project.findById(projectId);

  const isReviewed = project.reviews.find(
    (rev) => rev.user.toString() === req.user._id.toString()
  );

  if (isReviewed) {
    project.reviews.forEach((rev) => {
      if (rev.user.toString() === req.user._id.toString())
        (rev.rating = rating), (rev.comment = comment);
    });
  } else {
    project.reviews.push(review);
    project.numOfReviews = project.reviews.length;
  }

  let avg = 0;
  project.reviews.forEach((rev) => {
    avg += rev.rating;
  });

  project.ratings = avg / project.reviews.length;

  await project.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
  });
});

//GET ALL REVIEWS OF A Project
exports.getProjectReviews = catchAsyncErrors(async (req, res, next) => {
  const project = await Project.findById(req.query.id);

  if (!project) {
    return next(new ErrorHandler("Project not found"), 404);
  }

  res.status(200).json({
    success: true,
    reviews: project.reviews,
  });
});

// DELETE REVIEW
exports.deleteReview = catchAsyncErrors(async (req, res, next) => {
  const project = await Project.findById(req.query.projectId);

  if (!project) {
    return next(new ErrorHandler("Project does not exist"), 404);
  }

  const reviews = project.reviews.filter(
    (rev) => rev._id.toString() !== req.query.id.toString()
  );

  let avg = 0;
 
  reviews.forEach((rev) => {
    avg += rev.rating;
  });

  let rating = 0;
  if (reviews.length === 0) {
    rating = 0;
  } else {
    rating = avg / reviews.length;
  }
  rating = avg / reviews.length;

  const numOfReviews = reviews.length;

  await Project.findByIdAndUpdate(
    req.query.projectId,
    {
      reviews,
      rating,
      numOfReviews,
    },
    { new: true, runValidators: true, useFindAndModify: false }
  );

  res.status(200).json({
    success: true,
  });
});
