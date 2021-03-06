import React, { useState } from 'react';
import axios, { CancelTokenSource } from 'axios';
import { Link, Outlet, RouteObject, useParams } from "react-router-dom";
import { useForm, SubmitHandler } from "react-hook-form";
import QRCode from "react-qr-code";
import { GetConnectionReponse, IConnection } from './types';
import Popup from 'reactjs-popup';
import 'reactjs-popup/dist/index.css';

const defaultListOfConnections: IConnection[] = [];



export const Connections: React.FC = () => {
  const [listOfConnections, setListOfConnections]: [IConnection[], (listOfConnections: IConnection[]) => void] = React.useState(
    defaultListOfConnections
  );

  const [loading, setLoading]: [
    boolean,
    (loading: boolean) => void
  ] = React.useState<boolean>(true);

  const [error, setError]: [string, (error: string) => void] = React.useState(
    ''
  );

  const cancelToken = axios.CancelToken; //create cancel token
  const [cancelTokenSource, setCancelTokenSource]: [
    CancelTokenSource,
    (cancelTokenSource: CancelTokenSource) => void
  ] = React.useState(cancelToken.source());

  const handleCancelClick = () => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel('User cancelled operation');
    }
  };

  React.useEffect(() => {
    axios
      .get<GetConnectionReponse>('http://localhost:8000/issuer/faber/connections', {
        cancelToken: cancelTokenSource.token,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
      .then((response) => {
        setListOfConnections(response.data.results);
        setLoading(false);
      })
      .catch((ex) => {
        let error = axios.isCancel(ex)
          ? 'Request Cancelled'
          : ex.code === 'ECONNABORTED'
          ? 'A timeout has occurred'
          : ex.response.status === 404
          ? 'Resource Not Found'
          : 'An unexpected error has occurred';

        setError(error);
        setLoading(false);
      });
  }, []);
  const [invitationUrl, setInvitationUrl]: [string, (error: string) => void] = React.useState('');
  const handleNewInvitationClick = ()=> {
    axios
    .post('http://localhost:8000/issuer/faber/connections/create-invitation', {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })
    .then((response) => {
      console.dir(response.data)
        setInvitationUrl(response.data.invitation_url)
    })
  }
  const handleConnectionlessProofRequestClick = () =>{
    axios
      .post(`http://localhost:8000/issuer/faber/present-proof/create-request`
        , undefined
        , {
          params: {schema_name:'degree schema'},
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
      .then((response) => {
        setInvitationUrl( 'http://192.168.1.70:8000/issuer/faber/webhooks/pres_req/'+ response.data.presentation_exchange_id + '/')
      })
      .catch((ex) => {
        let error = axios.isCancel(ex)
          ? 'Request Cancelled'
          : ex.code === 'ECONNABORTED'
          ? 'A timeout has occurred'
          : ex.response.status === 404
          ? 'Resource Not Found'
          : 'An unexpected error has occurred';

        setError(error);
      });
  };
  return (
    <div>
      {loading && <button onClick={handleCancelClick}>Cancel</button>}
      <ul className="posts">
        {listOfConnections.map((post) => (
          <li key={post.connection_id}>
            <h3><Link to={post.connection_id}>{post.connection_id} ({post.state})</Link></h3>
          </li>
        ))}
      </ul>
      <button onClick={handleNewInvitationClick}>New Invitation</button>
      {error && <p className="error">{error}</p>}
      <button onClick={handleConnectionlessProofRequestClick}>Send Connectionless Proof Request</button>
      {invitationUrl && <><br/>{invitationUrl}<br/><br/>&nbsp;&nbsp;&nbsp;<QRCode value={invitationUrl} /></>}
    </div>
  );
};
type sendCredentialHandlerType = (credential_defintion_id:string) => void;

const SendCredentialScreen = ({sendCredentialHandler, value}:{value: string, sendCredentialHandler:sendCredentialHandlerType}) => {
  const [open, setOpen] = useState(false);
  const closeModal = () => setOpen(false);
  const [credentials, setCredentials] = React.useState([] as string[]);
  React.useEffect(() => {
    axios
      .get(`http://localhost:8000/issuer/faber/credential-definitions`, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })
      .then((response) => {
        setCredentials(response.data);
      })
  }, []);
  const selectCredentialDefinition = (credential_defintion_id:string) => {
    console.log(`credential_defintion_id=${credential_defintion_id}`)
    setOpen(false)
    sendCredentialHandler(credential_defintion_id)
  };
  return (
    <div>
      <button type="button" className="button" onClick={() => setOpen(o => !o)}>{value}</button>
      <Popup open={open} onClose={closeModal}>
        <div className="modal">
          <a className="close" onClick={closeModal}>
            &times;
          </a>
          <ul className="credential_definitions">
            {credentials.map((credential_id) => (
              <li key={credential_id}><a onClick={() => selectCredentialDefinition(credential_id)}>{credential_id}</a></li>
            ))}
          </ul>
        </div>
      </Popup>
    </div>
  );
};

export const ConnectionDetail: React.FC = () => {
    let { id } = useParams<"id">();
    const [connection, setConnection]: [IConnection, (connection: IConnection) => void] = React.useState({} as IConnection);
    
      const [loading, setLoading]: [
        boolean,
        (loading: boolean) => void
      ] = React.useState<boolean>(true);
    
      const [error, setError]: [string, (error: string) => void] = React.useState('');
    
      const cancelToken = axios.CancelToken; //create cancel token
      const [cancelTokenSource, setCancelTokenSource]: [
        CancelTokenSource,
        (cancelTokenSource: CancelTokenSource) => void
      ] = React.useState(cancelToken.source());
    
      const handleCancelClick = () => {
        if (cancelTokenSource) {
          cancelTokenSource.cancel('User cancelled operation');
        }
      };
      const handleSendCredential2Click = (credential_definition_id:string)=> {
        axios
        .post(`http://localhost:8000/issuer/faber/issue-credential/send-offer`
          , undefined
          , {
          params: {credential_definition_id: credential_definition_id, connection_id:id},
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        })
        .then((response) => {
            console.dir(response.data);
        })
      }
      const handleSendCredentialClick = ()=> {
        axios
        .post(`http://localhost:8000/issuer/faber/issue-credential/send-offer`
          , undefined
          , {
          params: {schema_name:'degree schema', connection_id:id},
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
        .then((response) => {
            console.dir(response.data);
        })
      };
      const handleProofRequestClick = () =>{
        axios
          .post(`http://localhost:8000/issuer/faber/present-proof/send-request`
            , undefined
            , {
              params: {schema_name:'degree schema', connection_id:id},
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          })
          .then((response) => {
              console.dir(response.data);
          })
          .catch((ex) => {
            let error = axios.isCancel(ex)
              ? 'Request Cancelled'
              : ex.code === 'ECONNABORTED'
              ? 'A timeout has occurred'
              : ex.response.status === 404
              ? 'Resource Not Found'
              : 'An unexpected error has occurred';
    
            setError(error);
          });
      };
      React.useEffect(() => {
        axios
          .get<IConnection>(`http://localhost:8000/issuer/faber/connections/${id}`, {
            cancelToken: cancelTokenSource.token,
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          })
          .then((response) => {
            setConnection(response.data);
            setLoading(false);
          })
          .catch((ex) => {
            let error = axios.isCancel(ex)
              ? 'Request Cancelled'
              : ex.code === 'ECONNABORTED'
              ? 'A timeout has occurred'
              : ex.response.status === 404
              ? 'Resource Not Found'
              : 'An unexpected error has occurred';
    
            setError(error);
            setLoading(false);
          });
      }, []);
    
      return (
        <div>
          {loading && <button onClick={handleCancelClick}>Cancel</button>}
          <h3>connection_id:{connection.connection_id}</h3>
          <div className="connectionDetail">
            {Object.entries(connection).map((entry) => (
              <div key={entry[0]}>{entry[0]}: {entry[1]}</div>
            ))}
          </div>
          <SendCredentialScreen value='Send Credential' sendCredentialHandler={handleSendCredential2Click}/>
          <button onClick={handleProofRequestClick}>Send Proof Request</button>

          <Link to="presentations">presentations</Link>
          <Link to="presentations/new">New Presentation</Link>
          {error && <p className="error">{error}</p>}
        </div>
      );
}

function ConnectionsFrame() {
    return (
      <div>
        <h2>Connections</h2>
        <Outlet />
      </div>
    );
}
interface PresentationExchange {
    thread_id: string;
    state: string
    role: string;
    initiator: string;
}
interface PresentationExchangeList {
    results: PresentationExchange[];
}


export const PresentationRequests: React.FC = () => {
    let { id } = useParams<"id">();
    const [presentations, setPresentations]: [PresentationExchange[], (connection: PresentationExchange[]) => void] = React.useState([] as PresentationExchange[]);
    
      const [loading, setLoading]: [
        boolean,
        (loading: boolean) => void
      ] = React.useState<boolean>(true);
    
      const [error, setError]: [string, (error: string) => void] = React.useState('');
    
      const cancelToken = axios.CancelToken; //create cancel token
      const [cancelTokenSource, setCancelTokenSource]: [
        CancelTokenSource,
        (cancelTokenSource: CancelTokenSource) => void
      ] = React.useState(cancelToken.source());
    
      const handleCancelClick = () => {
        if (cancelTokenSource) {
          cancelTokenSource.cancel('User cancelled operation');
        }
      };

      React.useEffect(() => {
        axios
          .get<PresentationExchangeList>(`http://localhost:8000/issuer/faber/present-proof/records?connection_id=${id}`, {
            cancelToken: cancelTokenSource.token,
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          })
          .then((response) => {
            setPresentations(response.data.results);
            setLoading(false);
          })
          .catch((ex) => {
            let error = axios.isCancel(ex)
              ? 'Request Cancelled'
              : ex.code === 'ECONNABORTED'
              ? 'A timeout has occurred'
              : ex.response.status === 404
              ? 'Resource Not Found'
              : 'An unexpected error has occurred';
    
            setError(error);
            setLoading(false);
          });
      }, []);
    
      return (
        <div>
          {loading && <button onClick={handleCancelClick}>Cancel</button>}
          <h3>presentations for <Link to={"/connections/" + id}>{id}</Link></h3>
          <ul className="presentations">
          {presentations.map((presentation) => (
          <li>
            {presentation.thread_id} - {presentation.role}:{presentation.initiator}:{presentation.state}
          </li>
        ))}
          </ul>
          {error && <p className="error">{error}</p>}
        </div>
      );
}

export const NewPresentationRequest: React.FC = () => {
    const [schemaIds, setSchemaIds] = React.useState([] as string[]);
    const [fields, setFields] = React.useState([] as string[]);
    const { register, handleSubmit } = useForm();
    const onSubmit: SubmitHandler<any> = data => console.log(data);
    React.useEffect(() => {
        // load schemIds
        axios
          .get(`http://localhost:8000/issuer/faber/schemas/created`, {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 10000,
          })
          .then((response) => {
            setSchemaIds(response.data.schema_ids as string[]);
          })
    })
    const handleSchemaIdChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        console.log(e.target.value)
        if (e.target.value.length > 0) {
            axios
            .get(`http://localhost:8000/issuer/faber/schemas/${e.target.value}`, {
              headers: {
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            })
            .then((response) => {
                setFields(response.data.schema.attrNames)
            })
        }else{
            setFields([])
        }
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <select {...register("schemaId")} onChange={handleSchemaIdChange} >
            <option value="">(select)</option>
            {schemaIds.map((schemaId) => (
            <option key={schemaId} value={schemaId}>{schemaId}</option>
            ))}
            </select><br/>
            {fields.map((fieldName) => (
                <div key={fieldName}><label>{fieldName}</label><input {...register(fieldName)} /><br /></div>
            ))}
            <input type="submit" />
        </form>
      );
};

export const ConnectionRoute:RouteObject = {
    path: "/connections",
    element: <ConnectionsFrame />,
    children: [
      { index: true, element: <Connections /> },
      { path: "/connections/:id", element: <ConnectionDetail /> },
      { path: "/connections/:id/presentations", element: <PresentationRequests /> },
      { path: "/connections/:id/presentations/new", element: <NewPresentationRequest /> },
    ]
  }

export default Connections;