import React, {
  useEffect,
  useState,
  useRef,
  useImperativeHandle,
  useTransition,
  useContext,
} from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import RoutedDoseForm from './RoutedDoseForm';
import { publishRecordForQCTask, saveDrugData, updateDrugData } from './Services/DrugService';
import {
  CHILD_DATA_ITEM,
  ERROR_TEXT,
  DATE_ERR_MSG,
  API_DATE_ERR,
  DRUG_ITEM_FACT_VALUES_SHOULD_CONTAIN,
  SUCCESS_STATUS_CODE,
  FILL_MANDATORY_FIELDS_MSG,
  STRENGTH,
  SAVE_AS_DRAFT,
  ITEM_STATUS_ACTIVE,
  ITEM_SUB_TYPE_ID_FOR_DRUG,
  ITEM_SUB_TYPE_ID_FOR_RDF,
  ITEM_SUB_TYPE_ID_FOR_STRENGTH,
  ITEM_SUB_TYPE_ID_FOR_PACKAGES,
  payloadForDrug,
  ACTIVE_INGREDIENT_PREDICATE,
  UPDATED_BY_PGUID,
  ERROR_MSG,
  ACTIVE_DATE,
  END_DATE_PAYLOAD,
  SUCCESS_TEXT,
  DATA_SAVED_SUCCESSFULLY,
  PUBLISH,
} from './constants';
import { PACKAGE } from './Package/PackageConstant';
import { DRUGNAME } from '../../utils/Constants/apiConstants';
import * as CONSTANTS from '../../components/RoutedDoseForm/constants';
import { mappedDrugNames } from '../TradeNames/trade.constants';
import { DrugMasterContext } from '../context/drugMasterContext';
import {
  createApiPayload,
  makeItemFactValues,
  makeIdentifiersValues,
  makeRelationshipValues,
  filterAndRemoveDuplicates,
  payloadForNorstellaBUDataSection,
  filterRelationhshipsForChildDataItem,
  mapRelationshipsforStrengthPackage,
  extractDateValues,
  mapRDFResponse,
  refreshPage,
  getNorstellaBUSectionIdentifiers,
  getOrgStatusIdentifiers,
  mapResponseForPrimaryNamesUsedInDrugNames,
  mapResponseForEvpLocaleUsedInDrugNames,
  bgTaskUtility,
  createBgTask,
  updateTask,
  checkTherapeuticClassStatus,
  getTaskId,
  makeClassifierValues,
} from './Utility';
import {
  drugGeneralSectionRelationshipPayload,
  payloadWrapperForGeneralSection,
} from '../DrugGeneralSection/DrugSectionUtility';
import {
  scrollIntoParticularSection,
  tradeNamePayloadChange,
} from '../TradeNames/TradeNamesUtility';
import {
  orgSectionRelationshipPayload,
  payloadWrapperForOrgSection,
} from '../OrgSection/orgstatus.utility';
import { payloadWrapperForActivitySection } from '../DrugActivitySection/drugActivitySection.utility';
import LatestChangePopUp from '../LatestChangePopUp';
import { getActivitySectionRelationshipData } from '../../modules/ActiveIngredient/makePayload';
import { payloadWrapperForBuSection } from '../NorstellaBuSection/norstella.bu.utility';
import { THERAPEUTIC_CLASS_STATUS } from '../DrugActivitySection/drugactivity.constants';
import {
  LATEST_CHANGE_DATE_FACTPGUID,
  LATEST_CHANGE_TEXT_FACTPGUID,
} from '../LatestChangePopUp/constant';
import { sleepForToast } from './EscalateAndRejectPopup/escalate.utility';
import { HAS_DOSEFORM } from './PPChild/PPChild.constants';

const RoutedDoseFormWrapper = React.forwardRef((props: any, ref) => {
  const [RDFFormData, setRDFFormData] = useState([]);
  const userProfile: any = localStorage.getItem('user_profile');
  let userName = '';
  if (userProfile) {
    userName = JSON.parse(userProfile).userName;
  }
  const childRef = useRef<any>(null);
  const payloadRef = useRef();
  const {
    currentBtnAction,
    activeIngredientsList,
    setIsDirty,
    setDrugLevelDataFromPUTResponse,
    scrolledDataSaved,
    setScrolledDataSaved,
  } = props;
  const location = useNavigate();
  const params = useParams();

  const [rdfResponse, setRdfResponse] = useState<any>([]);
  const [drugResponse, setDrugResponse] = useState<any>({});
  const [isDragAndDropDone, setIsDragAndDropDone] = useState<boolean>(false);
  const [isPending, setTransistion] = useTransition();
  const [drugID, setDrugID] = useState(params.drugId ? params.drugId : '');
  const [redirectionToEditScreen, setRedirectionToEditScreen] = useState<any>({
    flag: false,
    redirectTo: '',
  });
  const [currentPayload, setCurrentPayload] = useState<any>({});
  const [showPopUp, setPopUpStatus] = useState<boolean>(false);
  const [toastData, setToastData] = useState({
    open: false,
    message: '',
    type: '',
  });

  // Reload the page, when params changes
  useEffect(() => {
    if (drugID && params.drugId && drugID !== params.drugId) {
      window.location.reload();
      setActiveIngredientError(false);
    }
  }, [params.drugId]);

  const {
    generalFormState,
    tradeNameSection,
    setTradeNameError,
    orgFormStateForRelationShip,
    generalFormStateForRelationShip,
    orgFormState,
    responseFromEdit,
    responseFromEditForRelationship,
    setEditResponse,
    setEditResponseForRelationship,
    urlSection,
    setDrudId,
    norstellaBuFromState,
    activeIngredientSection,
    setActiveIngredientError,
    setDrugTypeError,
    drugName,
    drugType,
    onScrollSaveData,
    onButtonSaveData,
    drugActivitySectionFromState,
    primaryNamePayload,
    evpLocalePayload,
    drugActivitySectionConceptsDataFromState,
    pharmacokineticSection,
    setRestoreToOriginalGeneralSection,
    restoreToOriginalGeneralSection,
    setEditResponseForIdentifier,
    setEditResponseForClassifier,
    setIsEditMode,
    setUrlSection,
    setResetCustomValues,
    drugTherapeuticClassDataFromState,
    deleteDrug,
    taskDetails,
    setTaskDetails,
    childDataItem,
    payloadIdentifier,
    payloadClassifier,
    pvsPublishTo,
    ppChildRelationShip
  } = useContext(DrugMasterContext);

  const [_isPending, startTransistion] = useTransition();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showToast, setShowToast] = useState<boolean>(false);

  /**
   * Resetting the values when user navigates from edit to add screen from taskbar
   *
   */
  useEffect(() => {
    if (!params.drugId) {
      setEditResponseForIdentifier(undefined);
      setEditResponseForClassifier([]);
      setEditResponseForRelationship(undefined);
      setEditResponse(undefined);
      setIsEditMode(false);
      setUrlSection([]);
      setRestoreToOriginalGeneralSection(!restoreToOriginalGeneralSection);
      setResetCustomValues(false);
      startTransistion(() => {
        setResetCustomValues(true);
      });
    }
  }, [params.drugId]);

  // Generic Fn which handles payload
  const executeClickFn = (shouldValidate: any, executeClick: any) => {
    executeClick({ data: payloadRef.current, type: 3 });
  };

  // Called for drug level, when component mounts for binding callback
  useEffect(() => {
    payloadRef.current = JSON.parse(JSON.stringify(payloadForDrug));
    props.registerClick(executeClickFn);
  }, []);

  //For redirecting Page during edit mode
  useEffect(() => {
    if (
      redirectionToEditScreen.flag &&
      redirectionToEditScreen.redirectTo &&
      redirectionToEditScreen.redirectTo.length &&
      !toastData.open
    ) {
      setRedirectionToEditScreen({ flag: false, redirectTo: '' });
      location(redirectionToEditScreen.redirectTo); // Redirect to edit screen once toast is closed
      (async()=>{
        await sleepForToast(100)
        location(0); // Reloading
      })()
    }
  }, [redirectionToEditScreen.flag, toastData.open]);

  // This is to get restoreToOriginal function from child and send it parent
  useImperativeHandle(ref, () => ({
    restoreToOriginal: () => {
      if (childRef?.current?.restoreToOriginal) {
        childRef.current.restoreToOriginal();
      }
    },
  }));

  // Setting response from GET API
  useEffect(() => {
    setDrugResponse(props?.drugLevelData);
  }, [props?.drugLevelData]);

  // Called when submit button is clicked
  useEffect(() => {
    if (
      !Array.isArray(props?.payloadData) &&
      typeof props?.payloadData === 'object' &&
      currentBtnAction &&
      currentBtnAction.length
    ) {
      payloadRef.current = JSON.parse(JSON.stringify(payloadForDrug));
      setDrugLevelDataFromPUTResponse({});
      createAddDrugPayload();
    }
  }, [props.payloadData, currentBtnAction]);

  // Create final payload for the Drug + RDF
  const createAddDrugPayload = async () => {
    let drugDataItemID: any = drugID || props?.drugLevelData?.itemId;
    let drugitemFactFormValue: any = props?.payloadData?.itemFactValues;
    let filteredItemFactValues = filterAndRemoveDuplicates(
      drugitemFactFormValue,
    );

    let itemFactValuesForDrug: any[] = JSON.parse(JSON.stringify([]));
    let identifiersForDrug: any = JSON.parse(JSON.stringify([]));
    let relationshipForDrug: any = JSON.parse(JSON.stringify({}));
    let classifierForDrug: any = JSON.parse(JSON.stringify({}));
    const generalSectionData = payloadWrapperForGeneralSection(
      drugDataItemID,
      currentBtnAction,
      generalFormState,
      tradeNamePayloadChange(
        mappedDrugNames,
        tradeNameSection,
        drugDataItemID,
        responseFromEdit,
      ),
      responseFromEdit,
    );

    // Add itemFactvalues for Primary name/ Evp Locale used in drug
    let primaryNameDrugPayload: any = primaryNamePayload;
    let evpLocaleDrugPayload: any =
      mapResponseForEvpLocaleUsedInDrugNames(evpLocalePayload);
    if ((drugID || props?.isEditMode) && primaryNamePayload) {
      primaryNameDrugPayload = mapResponseForPrimaryNamesUsedInDrugNames(
        drugResponse,
        props?.drugLevelData,
        primaryNamePayload,
      );
    }
    generalSectionData.push(...primaryNameDrugPayload);

    const orgSectionPayload = payloadWrapperForOrgSection(
      props?.isEditMode,
      orgFormState,
      responseFromEdit,
    );

    const orgStatus = orgSectionPayload.filter(
      (item) => item.payloadType === CONSTANTS.ITEM_FACT_VALUES,
    );

    const orgStatusIdentifiersData = orgSectionPayload.filter(
      (item) => item.payloadType === CONSTANTS.IDENTIFIERS,
    );

    const orgStatusIdentifiersSection = getOrgStatusIdentifiers(
      orgStatusIdentifiersData,
    );

    const buData = payloadWrapperForBuSection(
      props?.isEditMode,
      norstellaBuFromState,
      responseFromEdit,
    );

    const drugActivitySection = payloadWrapperForActivitySection(
      drugActivitySectionFromState,
      responseFromEdit,
    );

    // On click of submit button, call api to generate data of 4 fields of norstellaBUData section
    let norstellaBUData: any = [];
    if (tradeNameSection.length && activeIngredientSection.length) {
      if (!drugDataItemID) {
        norstellaBUData = await payloadForNorstellaBUDataSection(); //first time
      } else {
        norstellaBUData = getNorstellaBUSectionIdentifiers(drugResponse); // else get response from api
      }
    }
    let itemFactValues = [
      ...filteredItemFactValues,
      ...generalSectionData,
      ...orgStatus,
      ...urlSection,
      ...buData,
      ...drugActivitySection,
      ...deleteDrug,
    ];
    itemFactValuesForDrug = makeItemFactValues(
      itemFactValues,
      currentBtnAction,
      SAVE_AS_DRAFT,
      userName,
      drugDataItemID,
    );
    itemFactValuesForDrug = [
      ...itemFactValuesForDrug,
      ...pharmacokineticSection,
      ...pvsPublishTo
    ];
    itemFactValuesForDrug.push(...evpLocaleDrugPayload);

    if (currentBtnAction === SAVE_AS_DRAFT && drugResponse?.itemFactValues) {
      const latestChangeData = drugResponse?.itemFactValues?.filter(
        (fact: any) =>
          fact.factPguid === LATEST_CHANGE_TEXT_FACTPGUID ||
          fact.factPguid === LATEST_CHANGE_DATE_FACTPGUID,
      );
      latestChangeData.forEach((fact: any) => {
        fact.validFrom = '';
      });
      itemFactValuesForDrug.push(...latestChangeData);
    }

    identifiersForDrug = makeIdentifiersValues(
      [
        ...props?.payloadData?.itemFactValues,
        ...norstellaBUData,
        ...orgStatusIdentifiersSection,
        ...payloadIdentifier,
      ],
      currentBtnAction,
      SAVE_AS_DRAFT,
      userName,
      drugDataItemID,
    );
    classifierForDrug = makeClassifierValues(
      [...payloadClassifier],
      currentBtnAction,
      SAVE_AS_DRAFT,
      userName,
      drugDataItemID,
    );

    let existingActiveIngredientList = [...activeIngredientsList].filter(
      (ele: any) => ele.id !== '',
    );
    let newActiveIngredients = [...activeIngredientsList]
      .filter((ele: any) => ele.id === '')
      .map((ele) => ele.label);
    filteredItemFactValues.push(
      ...createPayloadForActiveIngredient(existingActiveIngredientList),
    );
    relationshipForDrug = makeRelationshipValues(
      [
        ...filteredItemFactValues,
        ...norstellaBuFromState,
        ...drugTherapeuticClassDataFromState,
      ],
      currentBtnAction,
      SAVE_AS_DRAFT,
      userName,
      drugDataItemID,
    );

    /**
     * @description Getting  general section relationship payload during edit / Add /.
     */
    let generalSectionRelationPayload = drugGeneralSectionRelationshipPayload(
      generalFormStateForRelationShip,
      responseFromEditForRelationship,
      currentBtnAction,
      drugDataItemID,
    );
    let orgSectionRelationPayload = orgSectionRelationshipPayload(
      orgFormStateForRelationShip,
      responseFromEditForRelationship,
      currentBtnAction,
      props?.isEditMode,
    );
    let wipFlag = currentBtnAction === SAVE_AS_DRAFT;
    let activitySectionConceptsPayload = getActivitySectionRelationshipData(
      drugActivitySectionConceptsDataFromState,
      wipFlag,
      true,
    );

    relationshipForDrug.unshift(
      ...generalSectionRelationPayload,
      ...orgSectionRelationPayload,
      ...activitySectionConceptsPayload,
    );

    relationshipForDrug = relationshipForDrug? relationshipForDrug?.filter((otherPredicates:any)=>otherPredicates?.predicate !== HAS_DOSEFORM) : [];
    relationshipForDrug=[
      ...relationshipForDrug,
      ...ppChildRelationShip
    ];


    // Filter out dataItemId & updatedBy for Edit case
    let editedDataItemDetail: any = [];
    if (drugDataItemID) {
      editedDataItemDetail.push({
        itemId: drugDataItemID,
        updatedByPguid: userName,
      });
    }

    let drugPayload = createApiPayload(
      ITEM_STATUS_ACTIVE,
      ITEM_SUB_TYPE_ID_FOR_DRUG,
      itemFactValuesForDrug,
      identifiersForDrug,
      classifierForDrug,
      relationshipForDrug,
      drugDataItemID,
      editedDataItemDetail,
      newActiveIngredients,
      currentBtnAction,
    );

    let rdfPayload = createRdfPayload();
    const drugRelationships: any = JSON.parse(
      JSON.stringify(drugPayload.relationships),
    );
    // drugPayload[CHILD_DATA_ITEM] = rdfPayload;

    // Edit Case - Add relationships for childDataItem
    if (drugID || props?.isEditMode) {
      let childDataItemRelationships = filterRelationhshipsForChildDataItem(
        drugResponse?.relationships || props?.drugLevelData?.relationships,
        rdfPayload,
        drugRelationships,
      );

      drugPayload.relationships.push(...childDataItemRelationships);
    }
    if (drugDataItemID) {
      drugPayload[UPDATED_BY_PGUID] = userName;
      // drugPayload[CHILD_DATA_ITEM] = mapRelationshipsforStrengthPackage(
      //   drugPayload,
      //   drugResponse,
      // );
    }
    drugPayload[CHILD_DATA_ITEM] = childDataItem;
    const finalDrugPayload = drugDataItemID
      ? drugPayload
      : { druglevelDataItemDto: drugPayload };

    setCurrentPayload(finalDrugPayload);
    if (
      !activeIngredientSection.length &&
      currentBtnAction === CONSTANTS.PUBLISH
    ) {
      setActiveIngredientError(true); //Setting the error for active ingredient section
      scrollIntoParticularSection('15'); //Scrolling back to AI Section
    }
    if (!tradeNameSection.length && drugName && drugType) {
      setDrugTypeError(true);
      setTradeNameError(true);
    }
    if (!tradeNameSection.length) {
      if (!drugType) {
        setDrugTypeError(true); //Setting the error-true for drug type in general section
      }

      if (!drugName) {
        setTradeNameError(true); //Setting the error-true for drug name in general section
      }
      scrollIntoParticularSection('1'); //Scrolling back to General Section
    }

    if (tradeNameSection.length && activeIngredientSection.length) {
      if (currentBtnAction === PUBLISH && !props.deleteDrugStatus) {
        // if user removes value from status field in therapeutic class field and click submit, then scroll to the therapeutic class table
        if (drugTherapeuticClassDataFromState.length) {
          const isStatusFieldPresent = checkTherapeuticClassStatus(
            drugTherapeuticClassDataFromState,
          );
          if (isStatusFieldPresent) {
            setPopUpStatus(true);
          } else {
            setPopUpStatus(false);
          }
        } else {
          setPopUpStatus(true);
        }
      } else {
        // if user removes value from status field in therapeutic class field and click save as draft, then scroll it to the therapeutic class table
        if (drugTherapeuticClassDataFromState.length) {
          const isStatusFieldPresent = checkTherapeuticClassStatus(
            drugTherapeuticClassDataFromState,
          );
          if (!isStatusFieldPresent) return;
        }
        setPopUpStatus(false);
        saveDrugDataToDB(finalDrugPayload);
      }
    }
    if (
      tradeNameSection.length &&
      !activeIngredientSection.length &&
      currentBtnAction === SAVE_AS_DRAFT
    ) {
      // if user removes value from status field in therapeutic class field and click save as draft, then scroll it to the therapeutic class table
      if (drugTherapeuticClassDataFromState.length) {
        const isStatusFieldPresent = checkTherapeuticClassStatus(
          drugTherapeuticClassDataFromState,
        );
        if (!isStatusFieldPresent) return;
      }
      setPopUpStatus(false);
      setActiveIngredientError(false);
      saveDrugDataToDB(finalDrugPayload);
    }
  };

  // Sets popup status
  const updatePopUpStatus = (status: any) => {
    setPopUpStatus(status);
  };

  // For creating the payload for active ingredient
  const createPayloadForActiveIngredient = (ingredientList: any) => {
    let relationShipPayload = ingredientList.map((eachIngredient: any) => {
      let value = eachIngredient.id;
      let meta = {
        payloadType: 'relationships',
        additionalFact: null,
        predicate: ACTIVE_INGREDIENT_PREDICATE,
        response: eachIngredient.response,
      };
      return {
        meta,
        value,
      };
    });
    return relationShipPayload;
  };

  // Creates payload for RDF data item
  const createRdfPayload = () => {
    let rdfPayload: any = [];
    let drugDataItemID: any = drugID || props?.drugLevelData?.itemId;
    RDFFormData?.map((item: any, index: any) => {
      // Filter out dataItemId & updatedBy for Edit case
      let editedDataItemDetail: any = {};
      editedDataItemDetail = item?.filter((rdfItem: any) => {
        if ('itemId' in rdfItem) {
          return rdfItem;
        }
      });
      let itemFacts = makeItemFactValues(
        item,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
        editedDataItemDetail,
      );
      let identifiers = makeIdentifiersValues(
        item,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
      );
      let rdfRelationhips = makeRelationshipValues(
        item,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
      );

      let isStrength = item.find((rdfItems: any) => rdfItems.key === STRENGTH);
      let payload: any = createApiPayload(
        ITEM_STATUS_ACTIVE,
        ITEM_SUB_TYPE_ID_FOR_RDF,
        itemFacts,
        identifiers,
        rdfRelationhips,
        drugDataItemID,
        editedDataItemDetail,
      );

      // setting start date & end date
      let { stDate, endDate } = extractDateValues(item);
      payload[ACTIVE_DATE] = stDate;
      payload[END_DATE_PAYLOAD] = endDate;

      if (isStrength) {
        let strengthPayload = createStrengthPayload(
          isStrength?.strengthFormFields,
        );
        payload[CHILD_DATA_ITEM] = strengthPayload;
      }
      if (drugDataItemID && drugResponse?.childDataItem) {
        payload[CHILD_DATA_ITEM] = mapRelationshipsforStrengthPackage(
          payload,
          drugResponse?.childDataItem[index],
        );
      }
      rdfPayload.push(payload);
    });
    return rdfPayload;
  };

  // Creates payload for Strength data item
  const createStrengthPayload = (strForm: []) => {
    let strPayload: any = [];
    let drugDataItemID: any = drugID || props?.drugLevelData?.itemId;
    strForm?.map((strItem: any) => {
      // Filter out dataItemId & updatedBy for Edit case
      let editedDataItemDetail: any = {};
      if (drugDataItemID) {
        editedDataItemDetail = strItem?.filter((strengthItem: any) => {
          if ('itemId' in strengthItem) {
            return strengthItem;
          }
        });
      }

      let itemFacts = makeItemFactValues(
        strItem,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
        editedDataItemDetail,
      );
      let identifiers = makeIdentifiersValues(
        strItem,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
      );
      let strengthRelationhips = makeRelationshipValues(
        strItem,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
      );

      let payload: any = createApiPayload(
        ITEM_STATUS_ACTIVE,
        ITEM_SUB_TYPE_ID_FOR_STRENGTH,
        itemFacts,
        identifiers,
        strengthRelationhips,
        drugDataItemID,
        editedDataItemDetail,
      );

      // setting start date & end date
      let { stDate, endDate } = extractDateValues(strItem);
      payload[ACTIVE_DATE] = stDate;
      payload[END_DATE_PAYLOAD] = endDate;

      let isPackage = strItem.find(
        (strengthItem: any) => strengthItem.key === PACKAGE,
      );
      if (isPackage) {
        let strengthPayload = createPackagesPayload(isPackage?.PackageData);
        payload[CHILD_DATA_ITEM] = strengthPayload;
      }
      strPayload.push(payload);
    });
    return strPayload;
  };

  // Creates payload for Packages data item
  const createPackagesPayload = (packageForm: []) => {
    let packagePayload: any = [];
    let drugDataItemID: any = drugID || props?.drugLevelData?.itemId;
    packageForm?.map((item: any) => {
      // Filter out dataItemId & updatedBy for Edit case
      let editedDataItemDetail: any = {};
      if (drugDataItemID) {
        editedDataItemDetail = item?.filter((packageItem: any) => {
          if ('itemId' in packageItem) {
            return packageItem;
          }
        });
      }
      let itemFacts = makeItemFactValues(
        item,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
        editedDataItemDetail,
      );
      let identifiers = makeIdentifiersValues(
        item,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
      );
      let packageRelationhips = makeRelationshipValues(
        item,
        currentBtnAction,
        SAVE_AS_DRAFT,
        userName,
        drugDataItemID,
      );

      let payload: any = createApiPayload(
        ITEM_STATUS_ACTIVE,
        ITEM_SUB_TYPE_ID_FOR_PACKAGES,
        itemFacts,
        identifiers,
        packageRelationhips,
        drugDataItemID,
        editedDataItemDetail,
      );

      // setting start date & end date
      let { stDate, endDate } = extractDateValues(item);
      payload[ACTIVE_DATE] = stDate;
      payload[END_DATE_PAYLOAD] = endDate;

      packagePayload?.push(payload);
    });
    return packagePayload;
  };

  // sets RDFFormData with each addition of rdf data
  const setRDFData = (
    multipleFormData: any,
    editedRdfIndex: any,
    deleteItemIndex?: number,
  ) => {
    let data: any = JSON.parse(JSON.stringify([]));
    if (editedRdfIndex !== null) {
      RDFFormData?.map((item: any, index: any) => {
        if (index == editedRdfIndex) {
          data = RDFFormData;
          data[index] = multipleFormData[0];
        }
        return item;
      });
    } else if (deleteItemIndex !== null && deleteItemIndex !== undefined) {
      data = RDFFormData?.filter((_, idx) => idx !== deleteItemIndex);
    } else {
      if (data.push(...RDFFormData, ...multipleFormData) != 0) {
        setIsDirty?.(true);
      }
      setRDFFormData(data);
    }
    setRDFFormData(data);
  };

  useEffect(() => {
    if (rdfResponse.length) {
      setRDFData(rdfResponse, null);
    }
  }, [rdfResponse]);

  //Final save to rdf , for payload changes
  const finalSaveToRdfAfterDragAndDrop = (data: any, isDragDrop?: boolean) => {
    if (data) {
      setRDFFormData(data);
      if (isDragDrop) {
        setIsDragAndDropDone(true);
      }
    }
  };

  // Modular Function to save drugName and DrugId
  const setHeaderState = ({ item }: any) => {
    try {
      let drugName = '';
      let drugId = '';
      if (item?.itemFactValues) {
        if (params.drugId) {
          setEditResponse(item?.itemFactValues);
          setEditResponseForRelationship(item?.relationships);
          setEditResponseForIdentifier(item?.identifiers);
          setEditResponseForClassifier(item?.classifiers);
        }
        let drugNameList = item?.itemFactValues?.filter((item: any) => {
          return item.factPguid == DRUGNAME;
        });
        drugId = item?.itemId;
        if (drugNameList && drugNameList.length) {
          drugName = drugNameList[0]?.value;
        }
        props.setCommentsProps({ ...props.commentsProps, entityId: drugId });
        props.setEditStateForHeader({ drugName, drugId });
        setDrudId(drugId);
        return { drugName, drugId };
      }
    } catch (err) {
      console.error(err);
      return { drugName: '', drugId: '' };
    }
  };

  const BGTaskUpdate = async (
    drugId: any,
    currentBtnAction: string,
    handleEnableDisableEscalateButton: any,
    taskDetails: any,
    setTaskDetails: Function,
  ) => {
    try{
      await updateTask(
      drugId,
      currentBtnAction,
      handleEnableDisableEscalateButton,
      taskDetails,
      setTaskDetails,
    )
  if(currentBtnAction === CONSTANTS.PUBLISH && taskDetails?.taskType === CONSTANTS.QUALITY_CHECK){
    await publishRecordForQCTask(drugId, userName)
  }
  }catch(err){
      console.log(err)
    }
  };
  // Saves data to DB - Function calling API
  const saveDrugDataToDB = async (payload: any) => {
    try {
      let response: any;
      let drugDataItemID: any = drugID || props?.drugLevelData?.itemId;
      if (drugID || props?.isEditMode) {
        // If drugID present make PUT call else make POST call.
        response = await updateDrugData(payload, drugDataItemID);
      } else {
        response = await saveDrugData(payload);
      }
      if (response?.statusCode === SUCCESS_STATUS_CODE) {
        const { item } = response;
        const drugId = item?.itemId;
        setDrugID(drugId);
        setDrugResponse(item); // setting drug response
        const { drugName }: any = setHeaderState(response); //generic function to save header state
        let taskCreateData: any = undefined;
        if (onButtonSaveData || currentBtnAction == CONSTANTS.PUBLISH) {
          //BG TASK WILL BE ONLY CALLED WHEN CLICKED ON SAVE_AS_DRAFT OR SUBMIT
          taskCreateData = await createBgTask(
            drugId,
            drugName,
            props?.isEditMode,
            props.handleEnableDisableEscalateButton,
            undefined,
            taskDetails,
            setTaskDetails
          );
        }
        const { taskId } = taskCreateData || {};
        if (taskId) {
          setSearchParams({ task_id: taskId });
        }
        if (onButtonSaveData && !scrolledDataSaved) {
          handleOpenToast(
            props.restoreDrugStatus
              ? CONSTANTS.DATA_RESTORED_SUCCESSFULLY
              : props.deleteDrugStatus
              ? CONSTANTS.DATA_DELETED_SUCCESSFULLY
              : DATA_SAVED_SUCCESSFULLY,
            SUCCESS_TEXT,
          );
        }
        setIsDragAndDropDone(false);
        BGTaskUpdate(
          drugId,
          currentBtnAction,
          props.handleEnableDisableEscalateButton,
          taskCreateData || taskDetails,
          setTaskDetails,
        );
        let data: any = JSON.parse(JSON.stringify([]));
        setRDFFormData(data);

        if (typeof setDrugLevelDataFromPUTResponse === 'function') {
          setDrugLevelDataFromPUTResponse(item); // Setting drug response to be used by drug level form
        }

        const rdfResponse = response?.item?.childDataItem;
        if (rdfResponse?.length > 0) {
          const mappedRdfResponseForForm = mapRDFResponse(rdfResponse);
          setRdfResponse(mappedRdfResponseForForm); // setting drug childDataItem response
        } else if (rdfResponse?.length === 0) {
          setRdfResponse([]);
        }

        // Checking if it is in add mode and submit button or saveAsDraft is pressed not for autosave.
        if (
          !props?.isEditMode &&
          (currentBtnAction == CONSTANTS.PUBLISH || onButtonSaveData)
        ) {
          if (!drugId) return;
          let redirectTo = `/${CONSTANTS.EDIT_DRUG}/${drugId}`;
          const storedTaskIdUrl = getTaskId(
            taskId || taskDetails?.taskId,
            drugId,
          );

          if (currentBtnAction == CONSTANTS.PUBLISH) {
            // In submit case task is completed so appending of taskId is not required
            setRedirectionToEditScreen((prev: any) => ({
              ...prev,
              redirectTo,
            }));
          } else if (scrolledDataSaved) {
            // If data has been saved after scrolling
            // This changes the URL without reloading the page
            window.history.replaceState(
              null,
              '',
              `${CONSTANTS.EDIT_URL}${drugId}?taskId=${
                taskId || taskDetails?.taskId
              }`,
            );
            setScrolledDataSaved(false);
          } else {
            setRedirectionToEditScreen((prev: any) => ({
              // In Other case task is completed so appending of taskId is required
              ...prev,
              redirectTo: storedTaskIdUrl,
            }));
          }
          setTransistion(() => {
            setRedirectionToEditScreen((prev: any) => ({
              ...prev,
              flag: true,
            }));
          });
        } else if (props?.isEditMode && currentBtnAction == CONSTANTS.PUBLISH) {
          let url = `/${CONSTANTS.EDIT_DRUG}/${drugId}`;
          location(url);
          setTimeout(refreshPage, 4000);
        }
        
        if (drugId) {
          const newUrl = `${CONSTANTS.EDIT_URL}${drugId}${taskId ? `?taskId=${taskId}` : ''}`;
          window.history.replaceState(null, '', newUrl);
        }
        setScrolledDataSaved(false);
      } else {
        if (response?.errors[0] === DRUG_ITEM_FACT_VALUES_SHOULD_CONTAIN) {
          handleOpenToast(FILL_MANDATORY_FIELDS_MSG, ERROR_TEXT);
        } else if (response?.errors[0] === API_DATE_ERR) {
          handleOpenToast(DATE_ERR_MSG, ERROR_TEXT);
        } else {
          handleOpenToast(ERROR_MSG, ERROR_TEXT);
        }
      }
    } catch (err: any) {
      handleOpenToast(ERROR_MSG, ERROR_TEXT);
    }
  };
  // Function to open a toast notification with an error message
  const handleOpenToast = (message: string, type = ERROR_TEXT) => {
    setToastData({ open: true, message, type });
  };

  useEffect(() => {
    setShowToast(true);
  }, [onButtonSaveData])

  return (
    <>
      <RoutedDoseForm
        {...props}
        setRDFData={setRDFData}
        setIsDirty={setIsDirty}
        ref={childRef}
        finalSaveToRdfAfterDragAndDrop={finalSaveToRdfAfterDragAndDrop}
        isDragAndDropDone={isDragAndDropDone}
        setIsDragAndDropDone={setIsDragAndDropDone}
        toastData={toastData}
        setToastData={setToastData}
        rdfResponse={rdfResponse}
      />
      {showPopUp && (
        <LatestChangePopUp
          showPopUp={showPopUp}
          updatePopUpStatus={updatePopUpStatus}
          currentPayload={currentPayload}
          saveDrugDataToDB={saveDrugDataToDB}
          drugResponse={drugResponse}
          userName={userName}
          isEditMode={props?.isEditMode}
        />
      )}
    </>
  );
});

export default RoutedDoseFormWrapper;
