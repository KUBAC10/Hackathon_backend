import keystone from 'keystone';

/**
 * Table Column Settings Model
 * ===========================
 */
const TableColumnSettings = new keystone.List('TableColumnSettings', {
  track: true
});

TableColumnSettings.add(
  'Assets', {
    assets: {
      name: {
        type: Boolean,
        default: true
      },
      type: {
        type: Boolean,
        default: true
      },
      description: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Users', {
    users: {
      name: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: true
      },
      phoneNumber: {
        type: Boolean,
        default: true
      },
      address: {
        street: {
          type: Boolean,
          default: true
        },
        zipCode: {
          type: Boolean,
          default: true
        },
        city: {
          type: Boolean,
          default: true
        },
        country: {
          type: Boolean,
          default: true
        }
      },
      defaultLanguage: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Contacts', {
    contacts: {
      name: {
        type: Boolean,
        default: true
      },
      email: {
        type: Boolean,
        default: true
      },
      phoneNumber: {
        type: Boolean,
        default: true
      },
      tagEntities: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Questions', {
    questions: {
      name: {
        type: Boolean,
        default: true
      },
      type: {
        type: Boolean,
        default: true
      },
      general: {
        type: Boolean,
        default: true
      },
      description: {
        type: Boolean,
        default: true
      },
      trend: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Tags', {
    tags: {
      name: {
        type: Boolean,
        default: true
      },
      description: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Teams', {
    teams: {
      name: {
        type: Boolean,
        default: true
      },
      description: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Surveys', {
    surveys: {
      name: {
        type: Boolean,
        default: true
      },
      urlName: {
        type: Boolean,
        default: true
      },
      team: {
        type: Boolean,
        default: true
      },
      description: {
        type: Boolean,
        default: true
      },
      surveyType: {
        type: Boolean,
        default: true
      },
      active: {
        type: Boolean,
        default: true
      },
      publicAccess: {
        type: Boolean,
        default: true
      },
      totalInvites: {
        type: Boolean,
        default: true
      },
      totalCompleted: {
        type: Boolean,
        default: true
      },
      completedPercentage: {
        type: Boolean,
        default: true
      },
      lastAnswerDate: {
        type: Boolean,
        default: true
      },
      startDate: {
        type: Boolean,
        default: true
      },
      endDate: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Mailers', {
    mailers: {
      name: {
        type: Boolean,
        default: true
      },
      subject: {
        type: Boolean,
        default: true
      },
      globalMailer: {
        description: {
          type: Boolean,
          default: true
        },
        templateVariables: {
          type: Boolean,
          default: true
        }
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Emails', {
    emails: {
      name: {
        type: Boolean,
        default: true
      },
      type: {
        type: Boolean,
        default: true
      },
      mailer: {
        type: Boolean,
        default: true
      },
      lang: {
        type: Boolean,
        default: true
      },
      user: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Templates', {
    templates: {
      name: {
        type: Boolean,
        default: true
      },
      description: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      updatedAt: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
      updatedBy: {
        type: Boolean,
        default: true
      }
    }
  },
  'Trash', {
    trash: {
      _id: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
      expireDate: {
        type: Boolean,
        default: true
      },
      createdBy: {
        type: Boolean,
        default: true
      },
    }
  },
  'Survey Results', {
    surveyResults: {
      contact: {
        type: Boolean,
        default: true
      },
      token: {
        type: Boolean,
        default: true
      },
      step: {
        type: Boolean,
        default: true
      },
      completed: {
        type: Boolean,
        default: true
      },
      location: {
        type: Boolean,
        default: false
      },
      preview: {
        type: Boolean,
        default: true
      },
      startedAt: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Boolean,
        default: true
      },
    }
  }
);

/**
 * Registration
 */
TableColumnSettings.defaultColumns = 'name createdAt';
TableColumnSettings.register();

export default TableColumnSettings;
